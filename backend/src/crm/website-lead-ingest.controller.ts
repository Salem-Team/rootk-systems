import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { Public } from "../common/public.decorator";
import { AppRole } from "../common/roles";
import { CrmService } from "./crm.service";
import type { Actor } from "./crm-access";

/**
 * Unauthenticated website → CRM lead ingest (API key).
 * Keeps class-level JWT off this controller on purpose.
 */
@Controller("integrations/website")
export class WebsiteLeadIngestController {
  constructor(private readonly crm: CrmService) {}

  @Public()
  @Post("leads")
  async ingestLead(
    @Headers("x-rootk-ingest-key") ingestKey: string | undefined,
    @Body() body: Record<string, unknown>
  ) {
    const expected = process.env.CRM_WEBSITE_INGEST_KEY?.trim();
    if (!expected) {
      throw new UnauthorizedException("Website ingest is not configured");
    }
    if (!ingestKey || ingestKey !== expected) {
      throw new UnauthorizedException("Invalid ingest key");
    }

    const companyId = process.env.DEFAULT_COMPANY_ID?.trim();
    if (!companyId) {
      throw new BadRequestException("DEFAULT_COMPANY_ID is not configured");
    }

    const name = String(body.name ?? body.contactName ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    if (!name || !phone) {
      throw new BadRequestException("name and phone are required");
    }

    const notesParts = [
      String(body.notes ?? "").trim(),
      body.campaignSlug
        ? `campaign=${String(body.campaignSlug).trim()}`
        : "",
      body.landingPagePath
        ? `landing=${String(body.landingPagePath).trim()}`
        : "",
      body.utmSource ? `utm_source=${String(body.utmSource).trim()}` : "",
      body.utmMedium ? `utm_medium=${String(body.utmMedium).trim()}` : "",
      body.utmCampaign
        ? `utm_campaign=${String(body.utmCampaign).trim()}`
        : "",
      body.metaEventId
        ? `metaEventId=${String(body.metaEventId).trim()}`
        : "",
      body.leadUuid ? `websiteLeadUuid=${String(body.leadUuid).trim()}` : "",
      body.submissionId
        ? `submissionId=${String(body.submissionId).trim()}`
        : "",
    ].filter(Boolean);

    const actor: Actor = {
      userId: "website-ingest",
      employeeId: "",
      role: AppRole.admin,
      permissions: [
        "crm.createLeads",
        "crm.assignLeads",
        "crm.viewOthersLeads",
      ],
    };

    try {
      const lead = await this.crm.createLead(companyId, actor, {
        name,
        phone,
        email: String(body.email ?? "").trim(),
        companyName: String(body.companyName ?? body.company ?? "").trim(),
        source: body.source ?? "website",
        notes: notesParts.join("\n"),
        tags: Array.isArray(body.tags) ? body.tags : ["website", "campaign"],
        nextAction: "follow_up",
      });
      return { ok: true, lead };
    } catch (error) {
      if (error instanceof ConflictException) {
        return {
          ok: true,
          duplicate: true,
          message: "phone already exists in CRM",
        };
      }
      throw error;
    }
  }
}

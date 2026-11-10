import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import type { CrmLead } from "@prisma/client";
import { Public } from "../common/public.decorator";
import { AppRole } from "../common/roles";
import { PrismaService } from "../prisma/prisma.service";
import { CrmService } from "./crm.service";
import { CrmWebsiteAutoAssignService } from "./crm-website-auto-assign.service";
import type { Actor } from "./crm-access";
import { mapLead } from "./crm-mappers";
import { findLeadByCanonicalPhone } from "./crm-phone";
import { canonicalPhoneOrNull } from "../lib/phone-normalize";
import { executeWebsiteLeadIngest } from "./website-lead-ingest";

/**
 * Unauthenticated website → CRM lead ingest (API key).
 * Keeps class-level JWT off this controller on purpose.
 * The company is the integration key's configured company. A companyId in
 * the body is never the tenant that gets the lead.
 */
@Controller("integrations/website")
export class WebsiteLeadIngestController {
  constructor(
    private readonly crm: CrmService,
    private readonly prisma: PrismaService,
    private readonly autoAssign: CrmWebsiteAutoAssignService
  ) {}

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

    const decision = await executeWebsiteLeadIngest(
      {
        companyId,
        findBySubmissionId: (submissionId) =>
          this.prisma.crmLead.findFirst({
            where: { companyId, websiteSubmissionId: submissionId, deletedAt: null },
          }),
        findPhoneOwner: async (phone) => {
          const phoneNormalized = canonicalPhoneOrNull(phone);
          if (!phoneNormalized) return null;
          const owner = await findLeadByCanonicalPhone(
            this.prisma,
            companyId,
            phoneNormalized
          );
          if (!owner) return null;
          return { websiteSubmissionId: owner.websiteSubmissionId ?? null };
        },
        createLead: (leadBody) => this.crm.createLead(companyId, actor, leadBody),
        claimOwner: () => this.autoAssign.claimNextOwner(companyId),
      },
      body
    );

    return {
      ok: true,
      replay: decision.kind === "replay",
      submissionId: decision.submissionId,
      lead: decision.mapped ? decision.lead : mapLead(decision.lead as CrmLead),
      ...(decision.kind === "created"
        ? { autoAssignedTo: decision.autoAssignedTo }
        : {}),
    };
  }
}

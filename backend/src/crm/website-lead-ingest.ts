import { BadRequestException, ConflictException } from "@nestjs/common";
import { WebsiteSubmissionReplayError, normalizeWebsiteSubmissionId } from "./website-submission";

export type WebsiteIngestBody = Record<string, unknown>;

export type WebsiteIngestDecision =
  | {
      kind: "replay";
      submissionId: string;
      lead: unknown;
      mapped: false;
    }
  | {
      kind: "created";
      submissionId: string;
      lead: unknown;
      mapped: true;
      autoAssignedTo: string | null;
    };

type IngestDeps = {
  companyId: string;
  findBySubmissionId: (submissionId: string) => Promise<unknown | null>;
  createLead: (body: WebsiteIngestBody) => Promise<unknown>;
  claimOwner: () => Promise<string | null>;
};

function isUniqueConflict(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      (error as { code?: unknown }).code === "P2002"
  );
}

/**
 * Company comes from the authenticated integration, never from the body.
 * A matching submission id is a replay. A phone owned by another submission
 * is an explicit conflict and does not attach this id to the older lead.
 */
export async function executeWebsiteLeadIngest(
  deps: IngestDeps,
  body: WebsiteIngestBody
): Promise<WebsiteIngestDecision> {
  const suppliedCompany = body.companyId;
  if (
    suppliedCompany !== undefined &&
    suppliedCompany !== null &&
    String(suppliedCompany).trim() !== "" &&
    String(suppliedCompany).trim() !== deps.companyId
  ) {
    throw new BadRequestException("companyId does not match this integration");
  }

  const submissionId = normalizeWebsiteSubmissionId(body.submissionId);
  if (!submissionId) {
    throw new BadRequestException("submissionId is required");
  }

  const name = String(body.name ?? body.contactName ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  if (!name || !phone) {
    throw new BadRequestException("name and phone are required");
  }

  const alreadyStored = await deps.findBySubmissionId(submissionId);
  if (alreadyStored) {
    return { kind: "replay", submissionId, lead: alreadyStored, mapped: false };
  }

  const ownerEmployeeId = await deps.claimOwner();
  const leadBody: WebsiteIngestBody = {
    name,
    phone,
    email: String(body.email ?? "").trim(),
    companyName: String(body.companyName ?? body.company ?? "").trim(),
    source: body.source ?? "website",
    notes: String(body.notes ?? "").trim().slice(0, 2000),
    tags: Array.isArray(body.tags) ? body.tags : ["website", "campaign"],
    nextAction: "follow_up",
    websiteSubmissionId: submissionId,
    ...(ownerEmployeeId ? { ownerEmployeeId } : {}),
  };

  try {
    const lead = await deps.createLead(leadBody);
    return {
      kind: "created",
      submissionId,
      lead,
      mapped: true,
      autoAssignedTo: ownerEmployeeId,
    };
  } catch (error) {
    if (error instanceof WebsiteSubmissionReplayError) {
      return {
        kind: "replay",
        submissionId,
        lead: error.lead,
        mapped: false,
      };
    }
    if (isUniqueConflict(error) || error instanceof ConflictException) {
      const stored = await deps.findBySubmissionId(submissionId);
      if (stored) {
        return { kind: "replay", submissionId, lead: stored, mapped: false };
      }
      if (error instanceof ConflictException) {
        throw new ConflictException({
          message: "phone belongs to a different submission",
          code: "PHONE_OWNED_BY_OTHER_SUBMISSION",
          error: "Conflict",
          details: { accepted: false, submissionId },
        });
      }
    }
    throw error;
  }
}

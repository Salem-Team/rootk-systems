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

type PhoneOwner = {
  websiteSubmissionId: string | null;
};

type IngestDeps = {
  companyId: string;
  findBySubmissionId: (submissionId: string) => Promise<unknown | null>;
  findPhoneOwner: (phone: string) => Promise<PhoneOwner | null>;
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
 * A matching submission id is a replay. A phone owned by a different stored
 * submission id is an explicit conflict. A phone on a lead with no submission
 * id is unverifiable and is not attached to this submission.
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
        const owner = await deps.findPhoneOwner(phone);
        if (owner?.websiteSubmissionId === submissionId) {
          const storedAgain = await deps.findBySubmissionId(submissionId);
          if (storedAgain) {
            return {
              kind: "replay",
              submissionId,
              lead: storedAgain,
              mapped: false,
            };
          }
        }
        throw phoneConflictForOwner(owner, submissionId);
      }
    }
    throw error;
  }
}

/**
 * The response identifies the situation without the other lead's phone, name,
 * or database id. A null submission id is not proof of a different submission.
 */
function phoneConflictForOwner(
  owner: PhoneOwner | null,
  submissionId: string
): ConflictException {
  if (owner && owner.websiteSubmissionId === null) {
    return new ConflictException({
      message: "phone matches a lead created before submission ids",
      code: "LEGACY_MATCH_UNVERIFIABLE",
      error: "Conflict",
      details: { accepted: false, verifiable: false, submissionId },
    });
  }
  if (
    owner &&
    typeof owner.websiteSubmissionId === "string" &&
    owner.websiteSubmissionId !== submissionId
  ) {
    return new ConflictException({
      message: "phone belongs to a different submission",
      code: "PHONE_OWNED_BY_OTHER_SUBMISSION",
      error: "Conflict",
      details: { accepted: false, submissionId },
    });
  }
  return new ConflictException({
    message: "phone conflict could not be classified",
    code: "PHONE_CONFLICT_UNVERIFIED",
    error: "Conflict",
    details: { accepted: false, submissionId },
  });
}

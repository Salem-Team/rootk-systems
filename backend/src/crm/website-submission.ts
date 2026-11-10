import type { CrmLead } from "@prisma/client";

/** Website external ids look like `sub_<timestamp>_<suffix>`. */
const SUBMISSION_ID = /^[A-Za-z0-9:_-]{8,80}$/;

/**
 * Returns a submission id that is safe to store, or null when the value is
 * absent or not a submission id. Callers that require the field must reject
 * null themselves. This never invents an id for a historical lead.
 */
export function normalizeWebsiteSubmissionId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  if (!SUBMISSION_ID.test(id)) return null;
  return id;
}

/** Raised after the create transaction when this submission was already stored. */
export class WebsiteSubmissionReplayError extends Error {
  readonly lead: CrmLead;

  constructor(lead: CrmLead) {
    super("website submission already stored");
    this.name = "WebsiteSubmissionReplayError";
    this.lead = lead;
  }
}

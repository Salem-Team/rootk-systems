import {
  enrichPendingCallOutcome,
  pendingCallWasNotPlaced,
  shouldAutoRecordNoAnswer,
} from "@/lib/crm/enrich-pending-call";
import { pendingCallDurationSeconds, type PendingCrmCall } from "@/lib/crm/pending-call";
import { nativePlatform } from "@/lib/native/platform";
import { recordCrmLeadCall } from "@/services/crm.service";
import type { ApiResponse } from "@/types";
import type { CrmCall, CrmCallStatus, CrmNextAction } from "@/types/crm";

export type PersistPendingCallOptions = {
  status: CrmCallStatus;
  notes?: string;
  nextAction?: CrmNextAction;
  nextFollowUpAt?: string | null;
};

/** Persist a dialed pending call so it counts in user performance KPIs. */
export async function persistPendingCrmCall(
  pending: PendingCrmCall,
  options: PersistPendingCallOptions
): Promise<ApiResponse<CrmCall | null>> {
  const endedAt = pending.endedAt || new Date().toISOString();
  const source = pending.source === "web" ? nativePlatform() : pending.source;
  return recordCrmLeadCall(pending.leadId, {
    status: options.status,
    direction: "outgoing",
    source,
    externalCallId: pending.externalCallId,
    phoneNumber: pending.phone,
    startedAt: pending.startedAt,
    endedAt,
    durationSeconds: pendingCallDurationSeconds({ ...pending, endedAt }),
    notes: options.notes ?? "",
    nextAction: options.nextAction ?? "none",
    nextFollowUpAt: options.nextFollowUpAt ?? null,
  });
}

/**
 * A new dial replaces the stored pending call. Only keep the previous one
 * when Android CallLog shows a real outbound attempt.
 */
export async function settleDisplacedPendingCall(
  previous: PendingCrmCall
): Promise<ApiResponse<CrmCall | null> | null> {
  const enriched = await enrichPendingCallOutcome(previous);
  if (pendingCallWasNotPlaced(enriched)) return null;
  if (shouldAutoRecordNoAnswer(enriched)) {
    return persistPendingCrmCall(enriched, { status: "unknown" });
  }
  if (enriched.placed === true && enriched.detectedStatus === "answered") {
    return persistPendingCrmCall(enriched, { status: "answered" });
  }
  return null;
}

/** True when the call is already stored (success or idempotent replay). */
export function isPendingCallPersisted(res: ApiResponse<CrmCall | null>): boolean {
  if (res.success) return true;
  const details = res.error?.details;
  if (!details || typeof details !== "object") return false;
  return (
    "alreadySynchronized" in details ||
    (details as { code?: string }).code === "CALL_DUPLICATE"
  );
}

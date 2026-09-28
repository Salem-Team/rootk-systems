import {
  updatePendingCall,
  type PendingCrmCall,
} from "@/lib/crm/pending-call";
import { lookupOutboundCallInsight } from "@/lib/native/call-insight";
import { nativePlatform } from "@/lib/native/platform";

/**
 * Enrich a pending dial from Android CallLog.
 * Opening the dialer or contacts without placing a call is not a no-answer.
 */
export async function enrichPendingCallOutcome(
  pending: PendingCrmCall
): Promise<PendingCrmCall> {
  const startedMs = Date.parse(pending.startedAt);
  if (!Number.isFinite(startedMs)) return pending;

  if (nativePlatform() === "android") {
    const insight = await lookupOutboundCallInsight({
      phone: pending.phone,
      sinceEpochMs: startedMs,
    });
    if (insight?.found) {
      const talk = Math.max(0, Math.round(Number(insight.durationSeconds) || 0));
      const answered = insight.answered === true || talk > 0;
      return applyPendingPatch(pending, {
        talkDurationSeconds: talk,
        detectedStatus: answered ? "answered" : "unknown",
        osConfirmed: true,
        placed: true,
      });
    }
    if (insight && insight.found === false) {
      return applyPendingPatch(pending, {
        talkDurationSeconds: 0,
        detectedStatus: null,
        osConfirmed: false,
        placed: false,
      });
    }
  }

  return pending;
}

function applyPendingPatch(
  pending: PendingCrmCall,
  patch: Partial<PendingCrmCall>
): PendingCrmCall {
  const next: PendingCrmCall = { ...pending, ...patch };
  return updatePendingCall({ ...next, externalCallId: pending.externalCallId }) ?? next;
}

/** CallLog confirmed an outbound attempt that never connected. */
export function shouldAutoRecordNoAnswer(pending: PendingCrmCall): boolean {
  return (
    pending.placed === true &&
    pending.osConfirmed === true &&
    pending.detectedStatus === "unknown"
  );
}

/** Dialer or contacts opened, but the phone never placed the call. */
export function pendingCallWasNotPlaced(pending: PendingCrmCall): boolean {
  return pending.placed === false;
}

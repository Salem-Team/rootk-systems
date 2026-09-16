import {
  pendingCallDurationSeconds,
  updatePendingCall,
  type PendingCrmCall,
} from "@/lib/crm/pending-call";
import { lookupOutboundCallInsight } from "@/lib/native/call-insight";
import { nativePlatform } from "@/lib/native/platform";

/** Away shorter than this with no CallLog hit → treat as no answer. */
const SHORT_AWAY_NO_ANSWER_MS = 12_000;

/**
 * Enrich a pending dial with OS talk duration / answered flag (Android CallLog),
 * or a short-away heuristic when CallLog is unavailable.
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
      const next = updatePendingCall({
        externalCallId: pending.externalCallId,
        talkDurationSeconds: talk,
        detectedStatus: answered ? "answered" : "unknown",
        osConfirmed: true,
      });
      return next ?? pending;
    }
  }

  // Fallback when CallLog missing (iOS / web / permission denied).
  const awayMs = pending.endedAt
    ? Math.max(0, Date.parse(pending.endedAt) - startedMs)
    : Date.now() - startedMs;
  if (Number.isFinite(awayMs) && awayMs < SHORT_AWAY_NO_ANSWER_MS) {
    const next = updatePendingCall({
      externalCallId: pending.externalCallId,
      talkDurationSeconds: 0,
      detectedStatus: "unknown",
      osConfirmed: false,
    });
    return next ?? pending;
  }

  return pending;
}

export function shouldAutoRecordNoAnswer(pending: PendingCrmCall): boolean {
  if (pending.detectedStatus !== "unknown") return false;
  if (pending.osConfirmed) return true;
  // Short-away heuristic: auto-record so the user isn't asked after a quick hangup.
  return pendingCallDurationSeconds(pending) === 0;
}

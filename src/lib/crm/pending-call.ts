import { elapsedCallSeconds } from "@/lib/crm/call-duration";
import type { CrmCallStatus } from "@/types/crm";

const KEY = "rootk.pending-call";
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

export type PendingCrmCall = {
  leadId: string;
  leadName: string;
  phone: string;
  externalCallId: string;
  startedAt: string;
  endedAt?: string | null;
  source: "web" | "android" | "ios";
  /** Connected/talk seconds from OS CallLog when available (excludes ring). */
  talkDurationSeconds?: number | null;
  /** Outcome detected from OS (or short-away heuristic). */
  detectedStatus?: CrmCallStatus | null;
  /** True when duration/outcome came from OS CallLog. */
  osConfirmed?: boolean;
};

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function writePending(pending: PendingCrmCall) {
  const store = storage();
  if (!store) return;
  store.setItem(KEY, JSON.stringify(pending));
}

export function beginPendingCall(
  input: Omit<
    PendingCrmCall,
    | "startedAt"
    | "externalCallId"
    | "source"
    | "endedAt"
    | "talkDurationSeconds"
    | "detectedStatus"
    | "osConfirmed"
  > & {
    source?: PendingCrmCall["source"];
  }
): PendingCrmCall {
  const source = input.source ?? "web";
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now());
  const pending: PendingCrmCall = {
    ...input,
    source,
    startedAt: new Date().toISOString(),
    endedAt: null,
    externalCallId: `${source}:${id}`,
    talkDurationSeconds: null,
    detectedStatus: null,
    osConfirmed: false,
  };
  writePending(pending);
  return pending;
}

export function readPendingCall(): PendingCrmCall | null {
  const store = storage();
  if (!store) return null;
  const raw = store.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingCrmCall;
    if (!parsed?.leadId || !parsed.externalCallId) return null;
    const started = Date.parse(parsed.startedAt);
    if (Number.isFinite(started) && Date.now() - started > MAX_AGE_MS) {
      store.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function updatePendingCall(
  patch: Partial<PendingCrmCall> & { externalCallId: string }
): PendingCrmCall | null {
  const current = readPendingCall();
  if (!current || current.externalCallId !== patch.externalCallId) return null;
  const next = { ...current, ...patch };
  writePending(next);
  return next;
}

/** Freeze wall-clock end when the user returns from the dialer. */
export function markPendingCallReturned(): PendingCrmCall | null {
  const pending = readPendingCall();
  if (!pending) return null;
  if (pending.endedAt) return pending;
  const next = { ...pending, endedAt: new Date().toISOString() };
  writePending(next);
  return next;
}

/** Prefer OS talk time; fall back to dial→return wall clock. */
export function pendingCallDurationSeconds(pending: PendingCrmCall): number {
  if (
    typeof pending.talkDurationSeconds === "number" &&
    Number.isFinite(pending.talkDurationSeconds) &&
    pending.talkDurationSeconds >= 0
  ) {
    return Math.min(86_400, Math.round(pending.talkDurationSeconds));
  }
  return elapsedCallSeconds(pending.startedAt, pending.endedAt);
}

export function clearPendingCall(externalCallId?: string): void {
  const store = storage();
  if (!store) return;
  if (!externalCallId) {
    store.removeItem(KEY);
    return;
  }
  const current = readPendingCall();
  if (!current || current.externalCallId === externalCallId) {
    store.removeItem(KEY);
  }
}

export function pendingCallIsRipe(minMs = 1500): boolean {
  const pending = readPendingCall();
  if (!pending) return false;
  const started = Date.parse(pending.startedAt);
  if (!Number.isFinite(started)) return true;
  return Date.now() - started >= minMs;
}

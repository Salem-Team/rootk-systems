import { elapsedCallSeconds } from "@/lib/crm/call-duration";

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
  input: Omit<PendingCrmCall, "startedAt" | "externalCallId" | "source" | "endedAt"> & {
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

/** Freeze duration when the user returns from the dialer. */
export function markPendingCallReturned(): PendingCrmCall | null {
  const pending = readPendingCall();
  if (!pending) return null;
  if (pending.endedAt) return pending;
  const next = { ...pending, endedAt: new Date().toISOString() };
  writePending(next);
  return next;
}

export function pendingCallDurationSeconds(pending: PendingCrmCall): number {
  return elapsedCallSeconds(pending.startedAt, pending.endedAt);
}

export function clearPendingCall(): void {
  storage()?.removeItem(KEY);
}

export function pendingCallIsRipe(minMs = 1500): boolean {
  const pending = readPendingCall();
  if (!pending) return false;
  const started = Date.parse(pending.startedAt);
  if (!Number.isFinite(started)) return true;
  return Date.now() - started >= minMs;
}

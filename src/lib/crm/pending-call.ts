const KEY = "rootk.pending-call";

export type PendingCrmCall = {
  leadId: string;
  leadName: string;
  phone: string;
  externalCallId: string;
  startedAt: string;
  source: "web" | "android" | "ios";
};

function canUseSession(): boolean {
  return typeof window !== "undefined" && Boolean(window.sessionStorage);
}

export function beginPendingCall(input: Omit<PendingCrmCall, "startedAt" | "externalCallId" | "source"> & {
  source?: PendingCrmCall["source"];
}): PendingCrmCall {
  const pending: PendingCrmCall = {
    ...input,
    source: input.source ?? "web",
    startedAt: new Date().toISOString(),
    externalCallId:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `web:${crypto.randomUUID()}`
        : `web:${Date.now()}`,
  };
  if (canUseSession()) {
    window.sessionStorage.setItem(KEY, JSON.stringify(pending));
  }
  return pending;
}

export function readPendingCall(): PendingCrmCall | null {
  if (!canUseSession()) return null;
  const raw = window.sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingCrmCall;
    if (!parsed?.leadId || !parsed.externalCallId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingCall(): void {
  if (canUseSession()) window.sessionStorage.removeItem(KEY);
}

export function pendingCallIsRipe(minMs = 1500): boolean {
  const pending = readPendingCall();
  if (!pending) return false;
  const started = Date.parse(pending.startedAt);
  if (!Number.isFinite(started)) return true;
  return Date.now() - started >= minMs;
}

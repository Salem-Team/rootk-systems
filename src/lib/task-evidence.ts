import type { TaskStatus, WorkTask } from "@/types/work";

export interface TaskEvidenceInput {
  links?: string[];
  notes?: string;
}

const URL_RE = /^https?:\/\/.+/i;
export const EVIDENCE_NOTES_MIN = 3;
export const EVIDENCE_LINKS_MAX = 10;

/** Normalize a single evidence URL (adds https if missing). */
export function normalizeEvidenceUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function isValidEvidenceUrl(url: string): boolean {
  const normalized = normalizeEvidenceUrl(url);
  if (!normalized) return false;
  try {
    const parsed = new URL(normalized);
    return (
      URL_RE.test(normalized) &&
      Boolean(parsed.hostname) &&
      (parsed.hostname.includes(".") || parsed.hostname === "localhost")
    );
  } catch {
    return false;
  }
}

/** Host label for compact link chips (falls back to raw). */
export function evidenceLinkLabel(url: string): string {
  try {
    const parsed = new URL(normalizeEvidenceUrl(url));
    const path =
      parsed.pathname.length > 1
        ? parsed.pathname.replace(/\/$/, "").slice(0, 28)
        : "";
    return path ? `${parsed.hostname}${path}` : parsed.hostname;
  } catch {
    return url;
  }
}

/** Parse links from a textarea (one URL per line). */
export function parseEvidenceLinksText(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of text.split("\n")) {
    const normalized = normalizeEvidenceUrl(line);
    if (!normalized || !isValidEvidenceUrl(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= EVIDENCE_LINKS_MAX) break;
  }
  return out;
}

export function addEvidenceLink(
  current: string[],
  raw: string
): { links: string[]; error?: "invalid" | "duplicate" | "limit" } {
  const normalized = normalizeEvidenceUrl(raw);
  if (!normalized || !isValidEvidenceUrl(normalized)) {
    return { links: current, error: "invalid" };
  }
  if (current.includes(normalized)) {
    return { links: current, error: "duplicate" };
  }
  if (current.length >= EVIDENCE_LINKS_MAX) {
    return { links: current, error: "limit" };
  }
  return { links: [...current, normalized] };
}

export function taskRequiresEvidence(
  task: Pick<WorkTask, "requireEvidenceLinks" | "requireEvidenceNotes">
): boolean {
  return Boolean(task.requireEvidenceLinks || task.requireEvidenceNotes);
}

export function resolveTaskEvidence(
  task: Pick<WorkTask, "evidenceLinks" | "evidenceNotes">,
  override?: TaskEvidenceInput
): { links: string[]; notes: string } {
  return {
    links: (override?.links ?? task.evidenceLinks ?? [])
      .map(normalizeEvidenceUrl)
      .filter(isValidEvidenceUrl)
      .slice(0, EVIDENCE_LINKS_MAX),
    notes: (override?.notes ?? task.evidenceNotes ?? "").trim(),
  };
}

export function validateTaskEvidence(
  task: Pick<WorkTask, "requireEvidenceLinks" | "requireEvidenceNotes">,
  evidence: TaskEvidenceInput
): { ok: true } | { ok: false; code: "links" | "notes" | "both" } {
  const links = (evidence.links ?? [])
    .map(normalizeEvidenceUrl)
    .filter(isValidEvidenceUrl);
  const notes = (evidence.notes ?? "").trim();
  const linksOk = !task.requireEvidenceLinks || links.length > 0;
  const notesOk =
    !task.requireEvidenceNotes || notes.length >= EVIDENCE_NOTES_MIN;

  if (!linksOk && !notesOk) return { ok: false, code: "both" };
  if (!linksOk) return { ok: false, code: "links" };
  if (!notesOk) return { ok: false, code: "notes" };
  return { ok: true };
}

export function taskHasSubmittedEvidence(
  task: Pick<WorkTask, "evidenceLinks" | "evidenceNotes">
): boolean {
  const { links, notes } = resolveTaskEvidence(task);
  return links.length > 0 || notes.length > 0;
}

export function nextTaskStatus(status: TaskStatus): TaskStatus {
  const order: TaskStatus[] = ["todo", "in_progress", "completed"];
  return order[(order.indexOf(status) + 1) % order.length];
}

/** Whether moving to the next status must collect completion proof first. */
export function completionNeedsEvidenceDialog(task: WorkTask): boolean {
  return (
    nextTaskStatus(task.status) === "completed" && taskRequiresEvidence(task)
  );
}

export type EvidenceBadgeState = "required" | "submitted" | "none";

export function resolveEvidenceBadgeState(
  task: Pick<
    WorkTask,
    | "requireEvidenceLinks"
    | "requireEvidenceNotes"
    | "evidenceLinks"
    | "evidenceNotes"
    | "status"
  >
): EvidenceBadgeState {
  if (!taskRequiresEvidence(task)) return "none";
  if (taskHasSubmittedEvidence(task)) return "submitted";
  return "required";
}

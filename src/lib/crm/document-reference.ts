import type { CrmClientRequest } from "@/types/crm";

const REFERENCE_PATTERN = /^RK-(\d+)$/;

export function formatDocumentReference(serial: number): string {
  const safe = Math.max(1, Math.floor(serial));
  return `RK-${String(safe).padStart(4, "0")}`;
}

export function parseDocumentReference(value: unknown): number | null {
  const match = String(value ?? "")
    .trim()
    .toUpperCase()
    .match(REFERENCE_PATTERN);
  if (!match) return null;
  const serial = Number(match[1]);
  return Number.isInteger(serial) && serial > 0 ? serial : null;
}

function isLetter(row: CrmClientRequest): boolean {
  return row.kind === "technical_proposal" || row.kind === "contract";
}

/** Same serial for a client's annex and contract. The next client gets the next number. */
export function withClientDocumentNumbers(
  rows: readonly CrmClientRequest[]
): CrmClientRequest[] {
  const live = rows.filter((row) => !row.deletedAt);
  let max = 0;
  for (const row of live) {
    const serial = parseDocumentReference(row.proposal?.reference);
    if (serial && serial > max) max = serial;
  }

  const byLead = new Map<string, CrmClientRequest[]>();
  for (const row of live) {
    if (!isLetter(row) || !row.proposal) continue;
    const group = byLead.get(row.leadId) ?? [];
    group.push(row);
    byLead.set(row.leadId, group);
  }

  const nextById = new Map<string, CrmClientRequest>();
  for (const group of byLead.values()) {
    const serials = group
      .map((row) => parseDocumentReference(row.proposal?.reference))
      .filter((serial): serial is number => serial != null);
    const serial = serials.length > 0 ? Math.min(...serials) : ++max;
    const reference = formatDocumentReference(serial);
    for (const row of group) {
      if (!row.proposal || row.proposal.reference === reference) continue;
      nextById.set(row.id, {
        ...row,
        proposal: { ...row.proposal, reference },
      });
    }
  }

  if (nextById.size === 0) return [...rows];
  return rows.map((row) => nextById.get(row.id) ?? row);
}

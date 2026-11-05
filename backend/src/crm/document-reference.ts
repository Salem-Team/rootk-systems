import { CrmClientRequestKind, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { readTechnicalProposal } from "./technical-proposal";

const LETTERS = [
  CrmClientRequestKind.technical_proposal,
  CrmClientRequestKind.contract,
];

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

function readLeadSerial(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const raw = (metadata as { documentSerial?: unknown }).documentSerial;
  const serial = typeof raw === "number" ? raw : Number(raw);
  return Number.isInteger(serial) && serial > 0 ? serial : null;
}

function objectMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return metadata as Record<string, unknown>;
}

type Tx = Prisma.TransactionClient;

async function highestSerial(tx: Tx, companyId: string): Promise<number> {
  const leads = await tx.crmLead.findMany({
    where: { companyId },
    select: { metadata: true },
  });
  let max = 0;
  for (const lead of leads) {
    const serial = readLeadSerial(lead.metadata);
    if (serial && serial > max) max = serial;
  }
  const requests = await tx.crmClientRequest.findMany({
    where: { companyId, deletedAt: null, kind: { in: LETTERS } },
    select: { metadata: true },
  });
  for (const row of requests) {
    const serial = parseDocumentReference(
      readTechnicalProposal(row.metadata)?.reference
    );
    if (serial && serial > max) max = serial;
  }
  return max;
}

async function syncLead(
  tx: Tx,
  companyId: string,
  leadId: string,
  max: number
): Promise<number> {
  const lead = await tx.crmLead.findFirst({
    where: { id: leadId, companyId, deletedAt: null },
    select: { id: true, metadata: true },
  });
  if (!lead) return max;

  const requests = await tx.crmClientRequest.findMany({
    where: { companyId, leadId, deletedAt: null, kind: { in: LETTERS } },
    select: { id: true, metadata: true },
  });
  const withDocs = requests
    .map((row) => ({ row, proposal: readTechnicalProposal(row.metadata) }))
    .filter(
      (
        item
      ): item is {
        row: (typeof requests)[number];
        proposal: NonNullable<ReturnType<typeof readTechnicalProposal>>;
      } => item.proposal != null
    );
  if (withDocs.length === 0) return max;

  const leadSerial = readLeadSerial(lead.metadata);
  const docSerials = withDocs
    .map((item) => parseDocumentReference(item.proposal.reference))
    .filter((serial): serial is number => serial != null);
  let serial = leadSerial ?? (docSerials.length > 0 ? Math.min(...docSerials) : null);
  if (!serial) {
    max += 1;
    serial = max;
  } else if (serial > max) {
    max = serial;
  }
  const reference = formatDocumentReference(serial);

  if (leadSerial !== serial) {
    await tx.crmLead.update({
      where: { id: lead.id },
      data: {
        metadata: {
          ...objectMetadata(lead.metadata),
          documentSerial: serial,
        } as Prisma.InputJsonValue,
      },
    });
  }

  for (const item of withDocs) {
    if (item.proposal.reference === reference) continue;
    await tx.crmClientRequest.update({
      where: { id: item.row.id },
      data: {
        metadata: {
          ...objectMetadata(item.row.metadata),
          proposal: { ...item.proposal, reference },
        } as Prisma.InputJsonValue,
      },
    });
  }
  return max;
}

/** Assign one sequential file number per client and stamp it on the annex and contract. */
export async function syncClientDocumentReferences(
  prisma: PrismaService,
  companyId: string,
  leadIds: string[]
): Promise<void> {
  const ids = [...new Set(leadIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return;
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Company" WHERE id = ${companyId} FOR UPDATE`;
    let max = await highestSerial(tx, companyId);
    for (const leadId of ids) {
      max = await syncLead(tx, companyId, leadId, max);
    }
  });
}

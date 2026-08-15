/**
 * Idempotent, non-destructive backfill of CrmLead.phoneNormalized.
 * Never changes `phone`. Never deletes rows. Safe to re-run.
 *
 *   npx tsx --tsconfig backend/tsconfig.json backend/prisma/backfill-phone-normalized.ts
 */
import { PrismaClient } from "@prisma/client";
import { normalizeEgyptianMobile } from "../src/lib/phone-normalize";

const prisma = new PrismaClient();
const BATCH = 200;

async function main() {
  let cursor: string | undefined;
  let scanned = 0;
  let written = 0;
  let valid = 0;
  let invalid = 0;
  let unchanged = 0;
  const invalidSamples: Array<{ id: string; phone: string }> = [];
  const dupes = new Map<string, number>();

  for (;;) {
    const rows: Array<{ id: string; phone: string; phoneNormalized: string | null; companyId: string }> =
      await prisma.crmLead.findMany({
      where: { deletedAt: null },
      select: { id: true, phone: true, phoneNormalized: true, companyId: true },
      orderBy: { id: "asc" },
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (rows.length === 0) break;

    for (const row of rows) {
      scanned += 1;
      const parsed = normalizeEgyptianMobile(row.phone);
      if (!parsed.ok) {
        invalid += 1;
        if (invalidSamples.length < 20) {
          invalidSamples.push({ id: row.id, phone: row.phone });
        }
        if (row.phoneNormalized !== null) {
          await prisma.crmLead.update({
            where: { id: row.id },
            data: { phoneNormalized: null },
          });
          written += 1;
        } else {
          unchanged += 1;
        }
        continue;
      }
      valid += 1;
      const key = `${row.companyId}::${parsed.e164}`;
      dupes.set(key, (dupes.get(key) ?? 0) + 1);
      if (row.phoneNormalized === parsed.e164) {
        unchanged += 1;
        continue;
      }
      await prisma.crmLead.update({
        where: { id: row.id },
        data: { phoneNormalized: parsed.e164 },
      });
      written += 1;
    }
    cursor = rows[rows.length - 1]?.id;
  }

  const duplicateGroups = [...dupes.values()].filter((n) => n > 1).length;
  const report = {
    scanned,
    valid,
    invalid,
    written,
    unchanged,
    duplicateGroups,
    invalidSamples,
  };
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

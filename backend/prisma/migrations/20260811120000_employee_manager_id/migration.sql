-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "managerEmployeeId" TEXT;

-- CreateIndex
CREATE INDEX "Employee_companyId_managerEmployeeId_idx" ON "Employee"("companyId", "managerEmployeeId");

-- Backfill from existing managerName matches in the same company.
UPDATE "Employee" AS e
SET "managerEmployeeId" = m.id
FROM "Employee" AS m
WHERE e."companyId" = m."companyId"
  AND e."deletedAt" IS NULL
  AND m."deletedAt" IS NULL
  AND e.id <> m.id
  AND e."managerName" IS NOT NULL
  AND btrim(e."managerName") <> ''
  AND m."name" = e."managerName";

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "managerEmployeeIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill from the previous single-manager column.
UPDATE "Employee"
SET "managerEmployeeIds" = ARRAY["managerEmployeeId"]
WHERE "managerEmployeeId" IS NOT NULL AND btrim("managerEmployeeId") <> '';

-- DropIndex
DROP INDEX IF EXISTS "Employee_companyId_managerEmployeeId_idx";

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "managerEmployeeId";

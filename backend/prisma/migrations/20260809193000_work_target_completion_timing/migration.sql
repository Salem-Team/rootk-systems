-- Track assign → complete duration for work tasks and performance targets.
ALTER TABLE "WorkTask" ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "WorkTask" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

ALTER TABLE "PerformanceTarget" ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP(3);
ALTER TABLE "PerformanceTarget" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

-- Backfill from existing audit timestamps.
UPDATE "WorkTask"
SET "assignedAt" = "createdAt";

UPDATE "WorkTask"
SET "completedAt" = "updatedAt"
WHERE "status" = 'completed' AND "completedAt" IS NULL;

UPDATE "PerformanceTarget"
SET "assignedAt" = "createdAt"
WHERE "status" <> 'draft' AND "assignedAt" IS NULL;

UPDATE "PerformanceTarget"
SET "completedAt" = "updatedAt"
WHERE "status" = 'completed' AND "completedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "WorkTask_companyId_completedAt_idx" ON "WorkTask"("companyId", "completedAt");
CREATE INDEX IF NOT EXISTS "PerformanceTarget_companyId_completedAt_idx" ON "PerformanceTarget"("companyId", "completedAt");

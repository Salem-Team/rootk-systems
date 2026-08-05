-- Task completion evidence: admin can require links and/or notes before complete.
ALTER TABLE "WorkTask" ADD COLUMN IF NOT EXISTS "requireEvidenceLinks" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WorkTask" ADD COLUMN IF NOT EXISTS "requireEvidenceNotes" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WorkTask" ADD COLUMN IF NOT EXISTS "evidenceLinks" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "WorkTask" ADD COLUMN IF NOT EXISTS "evidenceNotes" TEXT NOT NULL DEFAULT '';

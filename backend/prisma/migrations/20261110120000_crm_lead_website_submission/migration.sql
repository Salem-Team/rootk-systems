-- Website ingest idempotency.
-- Existing CrmLead rows keep websiteSubmissionId NULL. PostgreSQL unique
-- indexes treat NULL as distinct, so historical leads are not collapsed onto
-- one key and are not assigned a submission id.
-- This statement does not rewrite lead rows.
ALTER TABLE "CrmLead" ADD COLUMN IF NOT EXISTS "websiteSubmissionId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "CrmLead_companyId_websiteSubmissionId_key"
  ON "CrmLead"("companyId", "websiteSubmissionId");

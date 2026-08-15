-- Additive, reversible CRM phone identity + call events.
-- Does not rewrite, delete, or truncate existing lead rows.

-- AlterTable
ALTER TABLE "CrmLead" ADD COLUMN IF NOT EXISTS "phoneNormalized" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CrmLead_companyId_phoneNormalized_idx"
  ON "CrmLead"("companyId", "phoneNormalized");

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CrmCallDirection" AS ENUM ('incoming', 'outgoing');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CrmCallStatus" AS ENUM ('answered', 'missed', 'rejected', 'failed', 'unknown');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CrmCallSource" AS ENUM ('manual', 'web', 'android', 'ios');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "CrmCall" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "employeeId" TEXT,
    "phone" TEXT NOT NULL,
    "phoneNormalized" TEXT,
    "direction" "CrmCallDirection" NOT NULL DEFAULT 'outgoing',
    "status" "CrmCallStatus" NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "source" "CrmCallSource" NOT NULL DEFAULT 'web',
    "externalCallId" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "activityId" TEXT,
    "feedbackId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "CrmCall_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CrmCall_companyId_externalCallId_key"
  ON "CrmCall"("companyId", "externalCallId");

CREATE INDEX IF NOT EXISTS "CrmCall_companyId_leadId_idx"
  ON "CrmCall"("companyId", "leadId");

CREATE INDEX IF NOT EXISTS "CrmCall_companyId_startedAt_idx"
  ON "CrmCall"("companyId", "startedAt");

CREATE INDEX IF NOT EXISTS "CrmCall_companyId_phoneNormalized_idx"
  ON "CrmCall"("companyId", "phoneNormalized");

DO $$ BEGIN
  ALTER TABLE "CrmCall"
    ADD CONSTRAINT "CrmCall_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CrmCall"
    ADD CONSTRAINT "CrmCall_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

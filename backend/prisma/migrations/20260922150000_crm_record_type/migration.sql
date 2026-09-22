-- CreateEnum
CREATE TYPE "CrmRecordType" AS ENUM ('lead', 'cold_call');

-- AlterTable
ALTER TABLE "CrmLead" ADD COLUMN "recordType" "CrmRecordType" NOT NULL DEFAULT 'lead';

-- CreateIndex
CREATE INDEX "CrmLead_companyId_recordType_idx" ON "CrmLead"("companyId", "recordType");

-- CreateIndex
CREATE INDEX "CrmLead_companyId_recordType_stageId_idx" ON "CrmLead"("companyId", "recordType", "stageId");

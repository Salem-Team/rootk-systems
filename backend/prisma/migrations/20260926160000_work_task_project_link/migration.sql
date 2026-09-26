ALTER TABLE "WorkTask" ADD COLUMN "projectId" TEXT;
ALTER TABLE "WorkTask" ADD COLUMN "phaseId" TEXT;

CREATE INDEX "WorkTask_companyId_projectId_idx" ON "WorkTask"("companyId", "projectId");

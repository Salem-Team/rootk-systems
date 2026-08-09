-- CreateTable
CREATE TABLE "CrmSubStage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "CrmSubStage_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "CrmLead" ADD COLUMN "subStageId" TEXT;

-- CreateIndex
CREATE INDEX "CrmSubStage_companyId_stageId_sortOrder_idx" ON "CrmSubStage"("companyId", "stageId", "sortOrder");

-- CreateIndex
CREATE INDEX "CrmSubStage_companyId_active_idx" ON "CrmSubStage"("companyId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CrmSubStage_companyId_stageId_name_key" ON "CrmSubStage"("companyId", "stageId", "name");

-- CreateIndex
CREATE INDEX "CrmLead_companyId_subStageId_idx" ON "CrmLead"("companyId", "subStageId");

-- AddForeignKey
ALTER TABLE "CrmSubStage" ADD CONSTRAINT "CrmSubStage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmSubStage" ADD CONSTRAINT "CrmSubStage_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "CrmStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_subStageId_fkey" FOREIGN KEY ("subStageId") REFERENCES "CrmSubStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

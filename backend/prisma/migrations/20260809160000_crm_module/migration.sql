-- CreateEnum
CREATE TYPE "CrmLeadStatus" AS ENUM ('active', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "CrmLeadSource" AS ENUM ('facebook', 'instagram', 'tiktok', 'website', 'whatsapp', 'referral', 'organic', 'advertisement', 'other');

-- CreateEnum
CREATE TYPE "CrmNextAction" AS ENUM ('call', 'whatsapp', 'email', 'meeting', 'follow_up', 'send_proposal', 'none');

-- CreateEnum
CREATE TYPE "CrmStageCategory" AS ENUM ('open', 'won', 'lost', 'other');

-- CreateEnum
CREATE TYPE "CrmActivityType" AS ENUM ('call', 'whatsapp', 'email', 'meeting', 'note', 'stage_change', 'assignment', 'feedback', 'follow_up', 'status_change', 'created', 'other');

-- CreateTable
CREATE TABLE "CrmStage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "conversionProbability" INTEGER,
    "category" "CrmStageCategory" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "CrmStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmFeedbackType" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isLossReason" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "CrmFeedbackType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmLead" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "companyName" TEXT NOT NULL DEFAULT '',
    "source" "CrmLeadSource" NOT NULL DEFAULT 'other',
    "ownerEmployeeId" TEXT,
    "stageId" TEXT NOT NULL,
    "status" "CrmLeadStatus" NOT NULL DEFAULT 'active',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nextAction" "CrmNextAction" NOT NULL DEFAULT 'none',
    "nextFollowUpAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3),
    "lossReasonTypeId" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "CrmLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmLeadActivity" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" "CrmActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "actorEmployeeId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "CrmLeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmLeadFeedback" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "feedbackTypeId" TEXT NOT NULL,
    "customerFeedback" TEXT NOT NULL DEFAULT '',
    "nextAction" "CrmNextAction" NOT NULL DEFAULT 'none',
    "nextFollowUpAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "recordedByEmployeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "CrmLeadFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmLeadHistoryEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "leadId" TEXT,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL DEFAULT '',
    "actorName" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "previousValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "CrmLeadHistoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmStage_companyId_sortOrder_idx" ON "CrmStage"("companyId", "sortOrder");

-- CreateIndex
CREATE INDEX "CrmStage_companyId_active_idx" ON "CrmStage"("companyId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CrmStage_companyId_name_key" ON "CrmStage"("companyId", "name");

-- CreateIndex
CREATE INDEX "CrmFeedbackType_companyId_sortOrder_idx" ON "CrmFeedbackType"("companyId", "sortOrder");

-- CreateIndex
CREATE INDEX "CrmFeedbackType_companyId_active_idx" ON "CrmFeedbackType"("companyId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CrmFeedbackType_companyId_name_key" ON "CrmFeedbackType"("companyId", "name");

-- CreateIndex
CREATE INDEX "CrmLead_companyId_ownerEmployeeId_idx" ON "CrmLead"("companyId", "ownerEmployeeId");

-- CreateIndex
CREATE INDEX "CrmLead_companyId_stageId_idx" ON "CrmLead"("companyId", "stageId");

-- CreateIndex
CREATE INDEX "CrmLead_companyId_status_idx" ON "CrmLead"("companyId", "status");

-- CreateIndex
CREATE INDEX "CrmLead_companyId_createdAt_idx" ON "CrmLead"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "CrmLead_companyId_nextFollowUpAt_idx" ON "CrmLead"("companyId", "nextFollowUpAt");

-- CreateIndex
CREATE INDEX "CrmLead_companyId_source_idx" ON "CrmLead"("companyId", "source");

-- CreateIndex
CREATE INDEX "CrmLead_companyId_lastActivityAt_idx" ON "CrmLead"("companyId", "lastActivityAt");

-- CreateIndex
CREATE INDEX "CrmLeadActivity_companyId_leadId_idx" ON "CrmLeadActivity"("companyId", "leadId");

-- CreateIndex
CREATE INDEX "CrmLeadActivity_companyId_occurredAt_idx" ON "CrmLeadActivity"("companyId", "occurredAt");

-- CreateIndex
CREATE INDEX "CrmLeadFeedback_companyId_leadId_idx" ON "CrmLeadFeedback"("companyId", "leadId");

-- CreateIndex
CREATE INDEX "CrmLeadFeedback_companyId_feedbackTypeId_idx" ON "CrmLeadFeedback"("companyId", "feedbackTypeId");

-- CreateIndex
CREATE INDEX "CrmLeadFeedback_companyId_createdAt_idx" ON "CrmLeadFeedback"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "CrmLeadHistoryEvent_companyId_leadId_idx" ON "CrmLeadHistoryEvent"("companyId", "leadId");

-- CreateIndex
CREATE INDEX "CrmLeadHistoryEvent_companyId_createdAt_idx" ON "CrmLeadHistoryEvent"("companyId", "createdAt");

-- AddForeignKey
ALTER TABLE "CrmStage" ADD CONSTRAINT "CrmStage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmFeedbackType" ADD CONSTRAINT "CrmFeedbackType_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "CrmStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLeadActivity" ADD CONSTRAINT "CrmLeadActivity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLeadActivity" ADD CONSTRAINT "CrmLeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLeadFeedback" ADD CONSTRAINT "CrmLeadFeedback_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLeadFeedback" ADD CONSTRAINT "CrmLeadFeedback_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLeadFeedback" ADD CONSTRAINT "CrmLeadFeedback_feedbackTypeId_fkey" FOREIGN KEY ("feedbackTypeId") REFERENCES "CrmFeedbackType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLeadHistoryEvent" ADD CONSTRAINT "CrmLeadHistoryEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLeadHistoryEvent" ADD CONSTRAINT "CrmLeadHistoryEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

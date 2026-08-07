-- CreateEnum
CREATE TYPE "TargetStatus" AS ENUM ('draft', 'assigned', 'in_progress', 'on_track', 'behind_schedule', 'delayed', 'completed', 'cancelled', 'archived');

-- CreateEnum
CREATE TYPE "TargetPriority" AS ENUM ('critical', 'high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "TargetAssigneeScope" AS ENUM ('employee', 'department', 'role', 'team', 'branch', 'multi');

-- CreateEnum
CREATE TYPE "TargetPenaltyType" AS ENUM ('written_warning', 'salary_deduction', 'performance_note', 'bonus_reduction', 'manager_review', 'custom');

-- CreateEnum
CREATE TYPE "TargetHealth" AS ENUM ('excellent', 'good', 'average', 'warning', 'critical', 'delayed');

-- CreateEnum
CREATE TYPE "TargetRiskLevel" AS ENUM ('low', 'medium', 'high', 'critical');

-- AlterEnum
ALTER TYPE "NotificationCategory" ADD VALUE 'target';

-- AlterTable
ALTER TABLE "WorkTask" ADD COLUMN     "targetId" TEXT;

-- CreateTable
CREATE TABLE "TargetCategory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#082868',
    "icon" TEXT NOT NULL DEFAULT 'Target',
    "description" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "TargetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetType" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "taskTitleTemplate" TEXT NOT NULL DEFAULT '{name} #{n}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "TargetType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "TargetTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetTemplateItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TargetTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceTarget" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "categoryId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "templateId" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "completedQuantity" INTEGER NOT NULL DEFAULT 0,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "priority" "TargetPriority" NOT NULL DEFAULT 'medium',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "assigneeScope" "TargetAssigneeScope" NOT NULL DEFAULT 'employee',
    "assigneeIds" TEXT[],
    "department" TEXT NOT NULL DEFAULT '',
    "branch" TEXT NOT NULL DEFAULT '',
    "roleKey" TEXT NOT NULL DEFAULT '',
    "ownerId" TEXT NOT NULL DEFAULT '',
    "status" "TargetStatus" NOT NULL DEFAULT 'draft',
    "health" "TargetHealth" NOT NULL DEFAULT 'average',
    "riskLevel" "TargetRiskLevel" NOT NULL DEFAULT 'low',
    "notes" TEXT NOT NULL DEFAULT '',
    "expectedCompletion" DATE,
    "performanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "PerformanceTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetWarning" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "managerNotes" TEXT NOT NULL DEFAULT '',
    "requiredAction" TEXT NOT NULL DEFAULT '',
    "penaltyType" "TargetPenaltyType" NOT NULL DEFAULT 'written_warning',
    "penaltyNote" TEXT NOT NULL DEFAULT '',
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "TargetWarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetHistoryEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "TargetHistoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TargetCategory_companyId_active_sortOrder_idx" ON "TargetCategory"("companyId", "active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TargetCategory_companyId_name_key" ON "TargetCategory"("companyId", "name");

-- CreateIndex
CREATE INDEX "TargetType_companyId_categoryId_active_idx" ON "TargetType"("companyId", "categoryId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "TargetType_companyId_categoryId_name_key" ON "TargetType"("companyId", "categoryId", "name");

-- CreateIndex
CREATE INDEX "TargetTemplate_companyId_active_idx" ON "TargetTemplate"("companyId", "active");

-- CreateIndex
CREATE INDEX "TargetTemplateItem_templateId_sortOrder_idx" ON "TargetTemplateItem"("templateId", "sortOrder");

-- CreateIndex
CREATE INDEX "TargetTemplateItem_companyId_idx" ON "TargetTemplateItem"("companyId");

-- CreateIndex
CREATE INDEX "PerformanceTarget_companyId_status_idx" ON "PerformanceTarget"("companyId", "status");

-- CreateIndex
CREATE INDEX "PerformanceTarget_companyId_endDate_idx" ON "PerformanceTarget"("companyId", "endDate");

-- CreateIndex
CREATE INDEX "PerformanceTarget_companyId_priority_idx" ON "PerformanceTarget"("companyId", "priority");

-- CreateIndex
CREATE INDEX "PerformanceTarget_companyId_categoryId_idx" ON "PerformanceTarget"("companyId", "categoryId");

-- CreateIndex
CREATE INDEX "PerformanceTarget_companyId_typeId_idx" ON "PerformanceTarget"("companyId", "typeId");

-- CreateIndex
CREATE INDEX "PerformanceTarget_companyId_riskLevel_idx" ON "PerformanceTarget"("companyId", "riskLevel");

-- CreateIndex
CREATE INDEX "TargetWarning_companyId_targetId_idx" ON "TargetWarning"("companyId", "targetId");

-- CreateIndex
CREATE INDEX "TargetWarning_companyId_employeeId_idx" ON "TargetWarning"("companyId", "employeeId");

-- CreateIndex
CREATE INDEX "TargetHistoryEvent_companyId_targetId_createdAt_idx" ON "TargetHistoryEvent"("companyId", "targetId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkTask_companyId_targetId_idx" ON "WorkTask"("companyId", "targetId");

-- AddForeignKey
ALTER TABLE "WorkTask" ADD CONSTRAINT "WorkTask_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "PerformanceTarget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetCategory" ADD CONSTRAINT "TargetCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetType" ADD CONSTRAINT "TargetType_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetType" ADD CONSTRAINT "TargetType_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TargetCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetTemplate" ADD CONSTRAINT "TargetTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetTemplate" ADD CONSTRAINT "TargetTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TargetCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetTemplateItem" ADD CONSTRAINT "TargetTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TargetTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetTemplateItem" ADD CONSTRAINT "TargetTemplateItem_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "TargetType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceTarget" ADD CONSTRAINT "PerformanceTarget_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceTarget" ADD CONSTRAINT "PerformanceTarget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TargetCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceTarget" ADD CONSTRAINT "PerformanceTarget_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "TargetType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceTarget" ADD CONSTRAINT "PerformanceTarget_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TargetTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetWarning" ADD CONSTRAINT "TargetWarning_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetWarning" ADD CONSTRAINT "TargetWarning_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "PerformanceTarget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetHistoryEvent" ADD CONSTRAINT "TargetHistoryEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetHistoryEvent" ADD CONSTRAINT "TargetHistoryEvent_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "PerformanceTarget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

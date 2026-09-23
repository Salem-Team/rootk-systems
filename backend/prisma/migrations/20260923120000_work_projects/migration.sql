-- CreateEnum
CREATE TYPE "WorkProjectStatus" AS ENUM ('planning', 'active', 'on_hold', 'completed');

-- CreateTable
CREATE TABLE "WorkProject" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "WorkProjectStatus" NOT NULL DEFAULT 'planning',
    "startDate" DATE,
    "endDate" DATE,
    "leadId" TEXT NOT NULL,
    "memberIds" TEXT[],
    "phases" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "WorkProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkProject_companyId_status_idx" ON "WorkProject"("companyId", "status");

-- CreateIndex
CREATE INDEX "WorkProject_companyId_leadId_idx" ON "WorkProject"("companyId", "leadId");

-- AddForeignKey
ALTER TABLE "WorkProject" ADD CONSTRAINT "WorkProject_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

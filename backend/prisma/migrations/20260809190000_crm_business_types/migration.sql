-- CreateTable
CREATE TABLE "CrmBusinessType" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
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

    CONSTRAINT "CrmBusinessType_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "CrmLead" ADD COLUMN "businessTypeId" TEXT;

-- CreateIndex
CREATE INDEX "CrmBusinessType_companyId_sortOrder_idx" ON "CrmBusinessType"("companyId", "sortOrder");

-- CreateIndex
CREATE INDEX "CrmBusinessType_companyId_active_idx" ON "CrmBusinessType"("companyId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CrmBusinessType_companyId_name_key" ON "CrmBusinessType"("companyId", "name");

-- CreateIndex
CREATE INDEX "CrmLead_companyId_businessTypeId_idx" ON "CrmLead"("companyId", "businessTypeId");

-- AddForeignKey
ALTER TABLE "CrmBusinessType" ADD CONSTRAINT "CrmBusinessType_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_businessTypeId_fkey" FOREIGN KEY ("businessTypeId") REFERENCES "CrmBusinessType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

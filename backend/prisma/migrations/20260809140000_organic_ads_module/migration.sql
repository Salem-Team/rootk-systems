-- CreateEnum
CREATE TYPE "AdPlatform" AS ENUM ('facebook', 'instagram', 'tiktok', 'linkedin', 'other', 'unknown');

-- CreateEnum
CREATE TYPE "AdType" AS ENUM ('post', 'reel', 'video', 'story', 'profile_post', 'other', 'unknown');

-- CreateEnum
CREATE TYPE "AdStatus" AS ENUM ('active', 'inactive', 'needs_review', 'duplicate');

-- CreateEnum
CREATE TYPE "AdValidationStatus" AS ENUM ('valid', 'invalid', 'broken', 'unsupported', 'pending');

-- AlterEnum
ALTER TYPE "NotificationCategory" ADD VALUE 'organic_ad';

-- CreateTable
CREATE TABLE "OrganicAdvertisement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "ownerEmployeeId" TEXT NOT NULL,
    "platform" "AdPlatform" NOT NULL DEFAULT 'unknown',
    "adType" "AdType" NOT NULL DEFAULT 'unknown',
    "url" TEXT NOT NULL,
    "canonicalUrl" TEXT NOT NULL,
    "externalId" TEXT,
    "project" TEXT NOT NULL DEFAULT '',
    "campaign" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "status" "AdStatus" NOT NULL DEFAULT 'needs_review',
    "validationStatus" "AdValidationStatus" NOT NULL DEFAULT 'pending',
    "validationMessage" TEXT NOT NULL DEFAULT '',
    "duplicateOfId" TEXT,
    "similarityScore" DOUBLE PRECISION,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" TIMESTAMP(3),
    "leadsCount" INTEGER,
    "qualifiedLeadsCount" INTEGER,
    "dealsCount" INTEGER,
    "workTaskId" TEXT,
    "targetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "OrganicAdvertisement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganicAdHistoryEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "advertisementId" TEXT,
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

    CONSTRAINT "OrganicAdHistoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganicAdsSettings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "weeklyTarget" INTEGER NOT NULL DEFAULT 3,
    "allowDuplicateOverride" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "OrganicAdsSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganicAdvertisement_workTaskId_key" ON "OrganicAdvertisement"("workTaskId");

-- CreateIndex
CREATE INDEX "OrganicAdvertisement_companyId_ownerEmployeeId_idx" ON "OrganicAdvertisement"("companyId", "ownerEmployeeId");

-- CreateIndex
CREATE INDEX "OrganicAdvertisement_companyId_status_idx" ON "OrganicAdvertisement"("companyId", "status");

-- CreateIndex
CREATE INDEX "OrganicAdvertisement_companyId_platform_idx" ON "OrganicAdvertisement"("companyId", "platform");

-- CreateIndex
CREATE INDEX "OrganicAdvertisement_companyId_canonicalUrl_idx" ON "OrganicAdvertisement"("companyId", "canonicalUrl");

-- CreateIndex
CREATE INDEX "OrganicAdvertisement_companyId_targetId_idx" ON "OrganicAdvertisement"("companyId", "targetId");

-- CreateIndex
CREATE INDEX "OrganicAdvertisement_companyId_addedAt_idx" ON "OrganicAdvertisement"("companyId", "addedAt");

-- CreateIndex
CREATE INDEX "OrganicAdvertisement_companyId_externalId_platform_idx" ON "OrganicAdvertisement"("companyId", "externalId", "platform");

-- CreateIndex
CREATE INDEX "OrganicAdHistoryEvent_companyId_createdAt_idx" ON "OrganicAdHistoryEvent"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "OrganicAdHistoryEvent_companyId_advertisementId_idx" ON "OrganicAdHistoryEvent"("companyId", "advertisementId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganicAdsSettings_companyId_key" ON "OrganicAdsSettings"("companyId");

-- AddForeignKey
ALTER TABLE "OrganicAdvertisement" ADD CONSTRAINT "OrganicAdvertisement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganicAdvertisement" ADD CONSTRAINT "OrganicAdvertisement_workTaskId_fkey" FOREIGN KEY ("workTaskId") REFERENCES "WorkTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganicAdvertisement" ADD CONSTRAINT "OrganicAdvertisement_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "PerformanceTarget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganicAdHistoryEvent" ADD CONSTRAINT "OrganicAdHistoryEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganicAdsSettings" ADD CONSTRAINT "OrganicAdsSettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

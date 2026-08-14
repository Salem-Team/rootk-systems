-- CreateEnum
CREATE TYPE "CrmMeetingMode" AS ENUM ('online', 'offline');

-- CreateEnum
CREATE TYPE "CrmMeetingLocation" AS ENUM ('our_company', 'client_company');

-- AlterTable
ALTER TABLE "CrmLeadFeedback" ADD COLUMN "meetingMode" "CrmMeetingMode",
ADD COLUMN "meetingLocation" "CrmMeetingLocation";

-- CreateTable
CREATE TABLE "WorkTaskComment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "parentId" TEXT,
    "authorUserId" TEXT NOT NULL,
    "authorEmployeeId" TEXT,
    "authorName" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "voiceFileId" TEXT,
    "voiceDurationMs" INTEGER,
    "voiceMime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "WorkTaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkTaskComment_companyId_taskId_createdAt_idx" ON "WorkTaskComment"("companyId", "taskId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkTaskComment_taskId_parentId_idx" ON "WorkTaskComment"("taskId", "parentId");

-- CreateIndex
CREATE INDEX "WorkTaskComment_companyId_voiceFileId_idx" ON "WorkTaskComment"("companyId", "voiceFileId");

-- AddForeignKey
ALTER TABLE "WorkTaskComment" ADD CONSTRAINT "WorkTaskComment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTaskComment" ADD CONSTRAINT "WorkTaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "WorkTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTaskComment" ADD CONSTRAINT "WorkTaskComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WorkTaskComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

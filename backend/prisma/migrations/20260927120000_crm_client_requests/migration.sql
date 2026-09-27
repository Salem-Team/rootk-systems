-- Sales requests to management: price exception, technical proposal, contract.

CREATE TYPE "CrmClientRequestKind" AS ENUM ('price_exception', 'technical_proposal', 'contract');
CREATE TYPE "CrmClientRequestStatus" AS ENUM ('open', 'answered');

CREATE TABLE "CrmClientRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "kind" "CrmClientRequestKind" NOT NULL,
    "status" "CrmClientRequestStatus" NOT NULL DEFAULT 'open',
    "message" TEXT NOT NULL,
    "listedPrice" TEXT NOT NULL DEFAULT '',
    "requestedPrice" TEXT NOT NULL DEFAULT '',
    "requestedByEmployeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "CrmClientRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmClientRequestReply" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorEmployeeId" TEXT,
    "fromManagement" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "CrmClientRequestReply_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CrmClientRequest_companyId_leadId_idx" ON "CrmClientRequest"("companyId", "leadId");
CREATE INDEX "CrmClientRequest_companyId_status_idx" ON "CrmClientRequest"("companyId", "status");
CREATE INDEX "CrmClientRequest_companyId_requestedByEmployeeId_idx" ON "CrmClientRequest"("companyId", "requestedByEmployeeId");
CREATE INDEX "CrmClientRequest_companyId_createdAt_idx" ON "CrmClientRequest"("companyId", "createdAt");
CREATE INDEX "CrmClientRequestReply_companyId_requestId_idx" ON "CrmClientRequestReply"("companyId", "requestId");
CREATE INDEX "CrmClientRequestReply_companyId_createdAt_idx" ON "CrmClientRequestReply"("companyId", "createdAt");

ALTER TABLE "CrmClientRequest" ADD CONSTRAINT "CrmClientRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CrmClientRequest" ADD CONSTRAINT "CrmClientRequest_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CrmClientRequestReply" ADD CONSTRAINT "CrmClientRequestReply_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CrmClientRequestReply" ADD CONSTRAINT "CrmClientRequestReply_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CrmClientRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

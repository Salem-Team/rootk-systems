-- Technical annex on a project: details plus the full write-up.
ALTER TABLE "WorkProject" ADD COLUMN "technicalDetails" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WorkProject" ADD COLUMN "fullDescription" TEXT NOT NULL DEFAULT '';

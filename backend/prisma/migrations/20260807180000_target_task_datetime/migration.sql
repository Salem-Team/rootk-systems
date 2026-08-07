-- Allow date+time on targets and linked work tasks (same-day windows supported).
ALTER TABLE "PerformanceTarget"
  ALTER COLUMN "startDate" TYPE TIMESTAMP(3)
    USING ("startDate"::timestamp),
  ALTER COLUMN "endDate" TYPE TIMESTAMP(3)
    USING ("endDate"::timestamp),
  ALTER COLUMN "expectedCompletion" TYPE TIMESTAMP(3)
    USING ("expectedCompletion"::timestamp);

ALTER TABLE "WorkTask"
  ALTER COLUMN "dueDate" TYPE TIMESTAMP(3)
    USING ("dueDate"::timestamp);

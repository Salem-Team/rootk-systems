-- Per-assignee completion progress on shared work tasks.
ALTER TABLE "WorkTask" ADD COLUMN IF NOT EXISTS "assigneeProgress" JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill from existing assigneeIds + shared status/evidence.
UPDATE "WorkTask"
SET "assigneeProgress" = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'employeeId', a.employee_id,
        'status', "WorkTask"."status"::text,
        'completedAt', CASE
          WHEN "WorkTask"."status"::text = 'completed'
            THEN to_char(COALESCE("WorkTask"."completedAt", "WorkTask"."updatedAt") AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
          ELSE NULL
        END,
        'evidenceLinks', to_jsonb(COALESCE("WorkTask"."evidenceLinks", ARRAY[]::text[])),
        'evidenceNotes', COALESCE("WorkTask"."evidenceNotes", '')
      )
      ORDER BY a.ord
    )
    FROM unnest("WorkTask"."assigneeIds") WITH ORDINALITY AS a(employee_id, ord)
  ),
  '[]'::jsonb
)
WHERE "assigneeProgress" = '[]'::jsonb
  AND cardinality("assigneeIds") > 0;

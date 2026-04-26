WITH ranked_rules AS (
  SELECT
    id,
    family_id,
    label,
    FIRST_VALUE(id) OVER (
      PARTITION BY family_id, label
      ORDER BY
        CASE status
          WHEN 'ACTIVE' THEN 0
          WHEN 'DISABLED' THEN 1
          ELSE 2
        END,
        updated_at DESC,
        created_at DESC,
        id DESC
    ) AS canonical_id,
    ROW_NUMBER() OVER (
      PARTITION BY family_id, label
      ORDER BY
        CASE status
          WHEN 'ACTIVE' THEN 0
          WHEN 'DISABLED' THEN 1
          ELSE 2
        END,
        updated_at DESC,
        created_at DESC,
        id DESC
    ) AS row_num
  FROM task_rules
),
duplicate_rules AS (
  SELECT id, canonical_id
  FROM ranked_rules
  WHERE row_num > 1
)
UPDATE task_events AS task_events
SET task_rule_id = duplicate_rules.canonical_id
FROM duplicate_rules
WHERE task_events.task_rule_id = duplicate_rules.id;

WITH ranked_rules AS (
  SELECT
    id,
    family_id,
    label,
    ROW_NUMBER() OVER (
      PARTITION BY family_id, label
      ORDER BY
        CASE status
          WHEN 'ACTIVE' THEN 0
          WHEN 'DISABLED' THEN 1
          ELSE 2
        END,
        updated_at DESC,
        created_at DESC,
        id DESC
    ) AS row_num
  FROM task_rules
)
DELETE FROM task_rules AS task_rules
USING ranked_rules
WHERE task_rules.id = ranked_rules.id
  AND ranked_rules.row_num > 1;

DROP INDEX IF EXISTS "task_rules_family_id_task_type_label_key";

CREATE UNIQUE INDEX "task_rules_family_id_label_key"
ON "task_rules"("family_id", "label");

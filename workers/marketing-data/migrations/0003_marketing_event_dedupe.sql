DELETE FROM marketing_events
WHERE id NOT IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY
          lead_id,
          event_type,
          COALESCE(magnet_slug, ''),
          COALESCE(tool_slug, '')
        ORDER BY created_at ASC, id ASC
      ) AS duplicate_rank
    FROM marketing_events
  )
  WHERE duplicate_rank = 1
);

CREATE UNIQUE INDEX IF NOT EXISTS marketing_events_identity_unique_idx
  ON marketing_events (
    lead_id,
    event_type,
    COALESCE(magnet_slug, ''),
    COALESCE(tool_slug, '')
  );

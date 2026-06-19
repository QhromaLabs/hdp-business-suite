-- Ensure the unique constraint exists on attendance(employee_id, date).
-- Required for upsert ON CONFLICT to work when clocking in.
-- Safe to run even if the constraint already exists.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'attendance'
      AND c.contype = 'u'
      AND c.conkey = ARRAY(
        SELECT attnum FROM pg_attribute
        WHERE attrelid = t.oid
          AND attname IN ('employee_id', 'date')
        ORDER BY attname
      )
  ) THEN
    ALTER TABLE public.attendance
      ADD CONSTRAINT attendance_employee_id_date_key UNIQUE (employee_id, date);
  END IF;
END;
$$;

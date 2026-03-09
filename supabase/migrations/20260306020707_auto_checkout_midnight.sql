-- Automatically clock out any agents who remain "on duty" past midnight
-- This uses pg_cron to schedule a function that runs daily.

-- Ensure pg_cron is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the automation function
CREATE OR REPLACE FUNCTION public.auto_checkout_midnight()
RETURNS void AS $$
BEGIN
  -- For any attendance record where check_out is null and the date is in the past,
  -- we auto clock them out at 23:59:59 of that specific day.
  -- This prevents agents from being continuously 'on duty' overnight.
  UPDATE public.attendance
  SET 
    -- We assume the 'date' column is a text string like '2026-03-05'
    -- We append 23:59:59 to clock them out at exactly the end of the day target
    check_out = (date || 'T23:59:59')
  WHERE check_out IS NULL 
    AND date < CURRENT_DATE::text;
    
  -- Also safety update to 'off_duty' status or something similar if that column exists,
  -- but our FieldSales.tsx logic currently checks `!a.check_out`, so just setting
  -- check_out is sufficient.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Unschedule in case it was created before
DO $$
BEGIN
  PERFORM cron.unschedule('daily_auto_checkout_midnight');
EXCEPTION WHEN OTHERS THEN
  -- ignore
END;
$$;

-- Schedule the job to run at midnight every day
-- Note: You might need to adjust the timezone depending on your Postgres config 
-- (0 0 * * * runs at midnight based on DB timezone)
SELECT cron.schedule(
  'daily_auto_checkout_midnight',
  '0 0 * * *',   -- Midnight (00:00) every day
  'SELECT public.auto_checkout_midnight()'
);

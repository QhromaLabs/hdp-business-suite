-- Update function to handle +254 vs 0 phone number formats
DROP FUNCTION IF EXISTS public.verify_delivery_agent_phone(text) CASCADE;

CREATE OR REPLACE FUNCTION public.verify_delivery_agent_phone(_phone text)
RETURNS TABLE (
  id uuid,
  full_name text,
  phone text,
  role public.app_role,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT e.id, e.full_name, e.phone, e.role, e.is_active
  FROM public.employees e
  WHERE 
    -- Compare normalized phone numbers (treat +254 as 0)
    REPLACE(REPLACE(e.phone, '+254', '0'), ' ', '') = REPLACE(REPLACE(_phone, '+254', '0'), ' ', '')
    AND e.is_active = true
    AND e.role = 'delivery_agent';
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_delivery_agent_phone(text) TO anon, authenticated, service_role;

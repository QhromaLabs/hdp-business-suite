-- Function to verify delivery agent phone number for login
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
  WHERE e.phone = _phone
  AND e.is_active = true
  AND e.role = 'delivery_agent';
END;
$$;

-- Grant execution to accessible roles (including anon for login)
GRANT EXECUTE ON FUNCTION public.verify_delivery_agent_phone(text) TO anon, authenticated, service_role;

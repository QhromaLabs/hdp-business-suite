-- 1. Update verify_delivery_agent_phone to also return user_id
CREATE OR REPLACE FUNCTION public.verify_delivery_agent_phone(_phone text)
RETURNS TABLE (
  id uuid,
  user_id uuid,
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
  SELECT e.id, e.user_id, e.full_name, e.phone, e.role, e.is_active
  FROM public.employees e
  WHERE 
    -- Compare normalized phone numbers (treat +254 as 0)
    REPLACE(REPLACE(e.phone, '+254', '0'), ' ', '') = REPLACE(REPLACE(_phone, '+254', '0'), ' ', '')
    AND e.is_active = true
    AND e.role = 'delivery_agent';
END;
$$;

-- 2. Create update_agent_location RPC (SECURITY DEFINER)
-- This allows agents to update their location via RPC even if they aren't fully authenticated in Supabase Auth
CREATE OR REPLACE FUNCTION public.update_agent_location(
  _user_id uuid,
  _lat numeric,
  _lng numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- We don't use auth.uid() here because agents might be using simplified login
  -- Instead we trust the user_id passed from the verified mobile app
  INSERT INTO public.user_locations (user_id, latitude, longitude, timestamp)
  VALUES (_user_id, _lat, _lng, now());
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.verify_delivery_agent_phone(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_agent_location(uuid, numeric, numeric) TO anon, authenticated, service_role;

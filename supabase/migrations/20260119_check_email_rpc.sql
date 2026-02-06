-- Function to check if an email exists in the employees table
-- This allows the mobile app to validate if a user is "allowed" to sign up
-- without exposing the entire employees table to public (anon) users.

CREATE OR REPLACE FUNCTION public.check_employee_email(_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres/admin)
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE email = _email 
    AND is_active = true
  );
END;
$$;

-- Grant access to anon (public) so unauthenticated users on the login screen can call it
GRANT EXECUTE ON FUNCTION public.check_employee_email(text) TO anon, authenticated, service_role;

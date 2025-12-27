CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  existing_employee_id UUID;
  existing_employee_role app_role;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );

  -- Check if there is an existing employee with this email
  SELECT id, role::app_role INTO existing_employee_id, existing_employee_role
  FROM public.employees
  WHERE email = NEW.email
  LIMIT 1;

  IF existing_employee_id IS NOT NULL THEN
    -- Link the user to the employee
    UPDATE public.employees
    SET user_id = NEW.id
    WHERE id = existing_employee_id;

    -- Assign the role from the employee record
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, COALESCE(existing_employee_role, 'clerk'));
  ELSE
    -- Default role is clerk
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'clerk');
  END IF;

  RETURN NEW;
END;
$$;

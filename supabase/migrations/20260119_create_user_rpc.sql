-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop the function first to allow update
DROP FUNCTION IF EXISTS public.create_new_user(text, text, text, text);

-- Function to create a user securely from the database side (callable via RPC)
CREATE OR REPLACE FUNCTION public.create_new_user(
  _email text,
  _password text,
  _full_name text,
  _role text DEFAULT 'clerk'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  new_user_id uuid;
  encrypted_pw text;
  v_instance_id uuid;
BEGIN
  -- 1. Authorization Check: Only Admin/Manager can call this
  IF NOT public.is_admin_or_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. only Admins or Managers can create new users.';
  END IF;

  -- 2. Check if email exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE auth.users.email = _email) THEN
    RAISE EXCEPTION 'User with this email already exists.';
  END IF;

  -- 3. Prepare data
  new_user_id := gen_random_uuid();
  encrypted_pw := crypt(_password, gen_salt('bf', 10)); -- Cost 10
  
  -- Get the correct instance_id
  SELECT instance_id INTO v_instance_id FROM auth.users WHERE id = auth.uid();
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000';
  END IF;

  -- 4. Insert into auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_super_admin,
    confirmation_token
  ) VALUES (
    new_user_id,
    v_instance_id,
    'authenticated',
    'authenticated',
    _email,
    encrypted_pw,
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', _full_name),
    now(),
    now(),
    false,
    encode(gen_random_bytes(32), 'hex')
  );

  -- 5. Insert into auth.identities (CRITICAL for Supabase Auth to work)
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    new_user_id, -- usually same as user_id for email provider
    new_user_id,
    jsonb_build_object('sub', new_user_id, 'email', _email, 'email_verified', true, 'phone_verified', false),
    'email',
    _email, -- provider_id is the email
    now(),
    now(),
    now()
  );

  -- 6. Role Assignment
  UPDATE public.user_roles 
  SET role = _role::public.app_role 
  WHERE user_id = new_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, _role::public.app_role);
  END IF;

  RETURN new_user_id;
END;
$$;

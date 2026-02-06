-- Compare working user (cliff) vs broken user (rose)
-- Select columns that are likely to matter
select 
  id,
  email,
  aud,
  role,
  is_super_admin,
  confirmed_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_sso_user,
  deleted_at,
  phone,
  phone_confirmed_at,
  email_change, 
  email_change_token_new, 
  recovery_token
from auth.users 
where email in ('cliffkarani1@gmail.com', 'rose@hdpk.co.ke');

select 
  email, 
  left(encrypted_password, 10) as pw_hash,
  raw_app_meta_data,
  raw_user_meta_data
from auth.users 
order by created_at desc 
limit 5;

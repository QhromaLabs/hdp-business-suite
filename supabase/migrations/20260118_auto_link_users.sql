-- Trigger function to link auth.users to public.employees
create or replace function public.handle_new_user_link_employee()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Check if an employee exists with the same email
  if exists (select 1 from public.employees where email = new.email) then
    -- Update the employee record with the new user_id
    update public.employees
    set user_id = new.id
    where email = new.email;
  end if;
  return new;
end;
$$;

-- Create the trigger on auth.users
drop trigger if exists on_auth_user_created_link_employee on auth.users;
create trigger on_auth_user_created_link_employee
  after insert on auth.users
  for each row execute procedure public.handle_new_user_link_employee();

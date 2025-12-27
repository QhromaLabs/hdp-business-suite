-- Allow authenticated users (presumably admins/staff) to manage the whitelist
-- In a real production scenario, you'd want to check for 'admin' role specifically.
-- For now, consistent with the plan, we allow authenticated users to INSERT and DELETE.

create policy "Allow authenticated insert"
on "public"."whitelisted_ips"
as permissive
for insert
to authenticated
with check (true);

create policy "Allow authenticated delete"
on "public"."whitelisted_ips"
as permissive
for delete
to authenticated
using (true);

create policy "Allow authenticated select"
on "public"."whitelisted_ips"
as permissive
for select
to authenticated
using (true);

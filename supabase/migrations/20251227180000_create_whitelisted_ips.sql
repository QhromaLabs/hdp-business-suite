-- Drop table if it exists to ensure a clean slate
DROP TABLE IF EXISTS "public"."whitelisted_ips";

create table "public"."whitelisted_ips" (
    "id" uuid not null default gen_random_uuid(),
    "ip_address" text not null,
    "description" text,
    "created_at" timestamp with time zone not null default now(),
    
    constraint "whitelisted_ips_pkey" primary key ("id"),
    constraint "whitelisted_ips_ip_address_key" unique ("ip_address")
);

alter table "public"."whitelisted_ips" enable row level security;

-- 1. Allow public read access (so specific restrictions work for anyone)
create policy "Allow public read access"
on "public"."whitelisted_ips"
as permissive
for select
to public
using (true);

-- 2. Allow authenticated users to INSERT
create policy "Allow authenticated insert"
on "public"."whitelisted_ips"
as permissive
for insert
to authenticated
with check (true);

-- 3. Allow authenticated users to DELETE
create policy "Allow authenticated delete"
on "public"."whitelisted_ips"
as permissive
for delete
to authenticated
using (true);

-- 4. Allow authenticated users to SELECT (redundant via public, but good for clarity)
create policy "Allow authenticated select"
on "public"."whitelisted_ips"
as permissive
for select
to authenticated
using (true);

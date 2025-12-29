create table if not exists public.customer_adjustments (
    id uuid not null default gen_random_uuid(),
    customer_id uuid not null references public.customers(id) on delete cascade,
    amount numeric not null,
    reason text,
    created_at timestamptz not null default now(),
    created_by uuid references auth.users(id),
    
    constraint customer_adjustments_pkey primary key (id)
);

-- RLS Policies
alter table public.customer_adjustments enable row level security;

create policy "Enable read access for authenticated users"
    on public.customer_adjustments for select
    to authenticated
    using (true);

create policy "Enable insert access for authenticated users"
    on public.customer_adjustments for insert
    to authenticated
    with check (true);

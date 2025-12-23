-- Create purchase_orders table
create table if not exists public.purchase_orders (
    id uuid default gen_random_uuid() primary key,
    order_number text not null,
    creditor_id uuid not null references public.creditors(id),
    total_amount decimal(10,2) not null default 0,
    paid_amount decimal(10,2) not null default 0,
    status text not null default 'pending', -- pending, partial, completed
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    expected_date date,
    notes text,
    created_by uuid references auth.users(id)
);

-- Enable RLS for purchase_orders
alter table public.purchase_orders enable row level security;


-- Policies for purchase_orders
do $$ 
begin
    if not exists (select 1 from pg_policies where policyname = 'Enable read access for all users' and tablename = 'purchase_orders') then
        create policy "Enable read access for all users" on public.purchase_orders for select using (true);
    end if;

    if not exists (select 1 from pg_policies where policyname = 'Enable insert access for all users' and tablename = 'purchase_orders') then
        create policy "Enable insert access for all users" on public.purchase_orders for insert with check (true);
    end if;

    if not exists (select 1 from pg_policies where policyname = 'Enable update access for all users' and tablename = 'purchase_orders') then
        create policy "Enable update access for all users" on public.purchase_orders for update using (true);
    end if;
end $$;

-- Create purchase_order_items table
create table if not exists public.purchase_order_items (
    id uuid default gen_random_uuid() primary key,
    purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
    variant_id uuid not null references public.product_variants(id),
    quantity integer not null,
    unit_cost decimal(10,2) not null,
    subtotal decimal(10,2) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for purchase_order_items
alter table public.purchase_order_items enable row level security;


-- Policies for purchase_order_items
do $$ 
begin
    if not exists (select 1 from pg_policies where policyname = 'Enable read access for all users' and tablename = 'purchase_order_items') then
        create policy "Enable read access for all users" on public.purchase_order_items for select using (true);
    end if;

    if not exists (select 1 from pg_policies where policyname = 'Enable insert access for all users' and tablename = 'purchase_order_items') then
        create policy "Enable insert access for all users" on public.purchase_order_items for insert with check (true);
    end if;

    if not exists (select 1 from pg_policies where policyname = 'Enable update access for all users' and tablename = 'purchase_order_items') then
        create policy "Enable update access for all users" on public.purchase_order_items for update using (true);
    end if;
end $$;

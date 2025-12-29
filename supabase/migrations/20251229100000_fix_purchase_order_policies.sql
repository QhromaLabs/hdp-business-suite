-- Enable delete access for purchase_orders
create policy "Enable delete access for all users" on public.purchase_orders for delete using (true);

-- Enable delete access for purchase_order_items
create policy "Enable delete access for all users" on public.purchase_order_items for delete using (true);

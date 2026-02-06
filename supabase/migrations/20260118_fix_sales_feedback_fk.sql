-- Add foreign key relationship if it doesn't exist
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'sales_feedback_sales_rep_id_fkey'
  ) then
    alter table public.sales_feedback
    add constraint sales_feedback_sales_rep_id_fkey
    foreign key (sales_rep_id) references public.employees(id);
  end if;
end $$;

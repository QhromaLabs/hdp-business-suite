-- Add role column to employees table
ALTER TABLE public.employees 
ADD COLUMN role text CHECK (role IN ('admin', 'manager', 'clerk', 'sales_rep'));

-- Comment on column
COMMENT ON COLUMN public.employees.role IS 'System role assigned to the employee (admin, manager, clerk, sales_rep)';

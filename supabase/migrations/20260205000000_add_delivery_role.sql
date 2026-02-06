-- Add delivery_agent to app_role enum
ALTER TYPE public.app_role ADD VALUE 'delivery_agent';

-- Update the CHECK constraint on employees table
-- Note: We have to drop and recreate the constraint if it has a name, 
-- but since it was added as an IN (...) CHECK in the migration, 
-- we can find the constraint name or just add a new one after dropping the old one.
-- Let's check the constraint name if possible. Usually it's like 'employees_role_check'.

DO $$
BEGIN
    ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_role_check;
    ALTER TABLE public.employees ADD CONSTRAINT employees_role_check CHECK (role IN ('admin', 'manager', 'clerk', 'sales_rep', 'delivery_agent'));
END $$;

-- Update comment on column
COMMENT ON COLUMN public.employees.role IS 'System role assigned to the employee (admin, manager, clerk, sales_rep, delivery_agent)';

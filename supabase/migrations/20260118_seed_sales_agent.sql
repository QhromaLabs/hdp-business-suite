-- Insert a test sales agent into the employees table
INSERT INTO public.employees (
    employee_number,
    full_name,
    email,
    phone,
    department,
    position,
    hire_date,
    basic_salary,
    is_active
) 
SELECT 
    'AGT-001',
    'Test Field Agent',
    'agent@hdp.com',
    '0722000000',
    'Sales',
    'Sales Representative',
    CURRENT_DATE,
    35000,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.employees WHERE email = 'agent@hdp.com'
);

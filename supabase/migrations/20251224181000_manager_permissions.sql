-- Allow Managers to update/delete/insert employees ONLY if the target employee is a clerk or sales_rep
CREATE POLICY "Managers can manage subordinates" ON public.employees
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'manager') AND 
  role IN ('clerk', 'sales_rep')
)
WITH CHECK (
  public.has_role(auth.uid(), 'manager') AND 
  role IN ('clerk', 'sales_rep')
);

-- Allow Managers to update/insert user_roles ONLY if the target role is clerk or sales_rep
CREATE POLICY "Managers can manage subordinate roles" ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'manager') AND 
  role IN ('clerk', 'sales_rep')
)
WITH CHECK (
  public.has_role(auth.uid(), 'manager') AND 
  role IN ('clerk', 'sales_rep')
);

-- Allow Managers to manage attendance for all (operational duty)
CREATE POLICY "Managers can manage attendance" ON public.attendance
FOR ALL 
TO authenticated
USING (public.has_role(auth.uid(), 'manager'));

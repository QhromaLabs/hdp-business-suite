-- Allow managers to view all roles (needed to fetch list of delivery agents)
CREATE POLICY "Managers can view all roles" ON public.user_roles 
FOR SELECT USING (has_role(auth.uid(), 'manager'));

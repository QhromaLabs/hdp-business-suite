-- Allow users to manage their own attendance records
-- This fix enables sales agents and other roles to clock in and out without being an admin/manager

CREATE POLICY "Users can manage own attendance" ON public.attendance
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = attendance.employee_id
    AND e.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = attendance.employee_id
    AND e.user_id = auth.uid()
  )
);

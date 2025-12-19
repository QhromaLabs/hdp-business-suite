import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Employee {
  id: string;
  user_id: string | null;
  employee_number: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  basic_salary: number;
  hire_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  notes: string | null;
  employee?: Employee;
}

export interface Payroll {
  id: string;
  employee_id: string;
  pay_period_start: string;
  pay_period_end: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  status: string;
  employee?: Employee;
}

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true)
        .order('full_name');
      
      if (error) throw error;
      return data as Employee[];
    },
  });
}

export function useAttendanceToday() {
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['attendance', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          employee:employees(*)
        `)
        .eq('date', today);
      
      if (error) throw error;
      return data as Attendance[];
    },
  });
}

export function usePayrollSummary() {
  return useQuery({
    queryKey: ['payroll_summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll')
        .select('*')
        .eq('status', 'pending');
      
      if (error) throw error;
      
      const summary = {
        totalSalaries: data.reduce((sum, p) => sum + Number(p.basic_salary), 0),
        allowances: data.reduce((sum, p) => sum + Number(p.allowances), 0),
        deductions: data.reduce((sum, p) => sum + Number(p.deductions), 0),
        netPayroll: data.reduce((sum, p) => sum + Number(p.net_salary), 0),
      };
      
      return summary;
    },
  });
}

export function usePayrollEntries() {
  return useQuery({
    queryKey: ['payroll'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll')
        .select('*, employee:employees(full_name, position, department)')
        .order('pay_period_end', { ascending: false })
        .limit(25);

      if (error) throw error;
      return data as Payroll[];
    },
  });
}

export function useCreatePayrollEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employee_id, basic_salary }: { employee_id: string; basic_salary: number }) => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const startDate = start.toISOString().split('T')[0];
      const endDate = end.toISOString().split('T')[0];

      const { data: existing, error: existingError } = await supabase
        .from('payroll')
        .select('id')
        .eq('employee_id', employee_id)
        .eq('pay_period_start', startDate)
        .eq('pay_period_end', endDate);

      if (existingError) throw existingError;
      if (existing && existing.length > 0) {
        throw new Error('Payroll already recorded for this period');
      }

      const entry = {
        employee_id,
        pay_period_start: startDate,
        pay_period_end: endDate,
        basic_salary,
        allowances: 0,
        deductions: 0,
        net_salary: basic_salary,
        status: 'pending',
      };

      const { error } = await supabase
        .from('payroll')
        .insert(entry);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      queryClient.invalidateQueries({ queryKey: ['payroll_summary'] });
      toast.success('Payroll recorded for this employee');
    },
    onError: (error) => {
      toast.error('Failed to record payroll: ' + error.message);
    },
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (employee: Omit<Employee, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('employees')
        .insert(employee)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create employee: ' + error.message);
    },
  });
}

export function useTerminateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employee_id }: { employee_id: string }) => {
      const { error } = await supabase
        .from('employees')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', employee_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee terminated');
    },
    onError: (error) => {
      toast.error('Failed to terminate: ' + error.message);
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employee: Partial<Employee> & { id: string }) => {
      const { id, ...updates } = employee;
      const { error } = await supabase
        .from('employees')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee updated');
    },
    onError: (error) => {
      toast.error('Failed to update employee: ' + error.message);
    },
  });
}

export function useRunPayroll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const startDate = start.toISOString().split('T')[0];
      const endDate = end.toISOString().split('T')[0];

      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, basic_salary, full_name')
        .eq('is_active', true);

      if (employeesError) throw employeesError;

      const { data: existing, error: existingError } = await supabase
        .from('payroll')
        .select('employee_id')
        .eq('pay_period_start', startDate)
        .eq('pay_period_end', endDate);

      if (existingError) throw existingError;

      const existingIds = new Set((existing || []).map(e => e.employee_id));
      const inserts = (employees || [])
        .filter(e => !existingIds.has(e.id))
        .map(emp => ({
          employee_id: emp.id,
          pay_period_start: startDate,
          pay_period_end: endDate,
          basic_salary: emp.basic_salary,
          allowances: 0,
          deductions: 0,
          net_salary: emp.basic_salary,
          status: 'pending',
        }));

      if (inserts.length === 0) {
        return { inserted: 0 };
      }

      const { error: insertError } = await supabase
        .from('payroll')
        .insert(inserts);

      if (insertError) throw insertError;

      return { inserted: inserts.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['payroll_summary'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      toast.success(result.inserted > 0 ? `Payroll generated for ${result.inserted} employees` : 'Payroll already up to date');
    },
    onError: (error) => {
      toast.error('Failed to run payroll: ' + error.message);
    },
  });
}

export function useMarkLeaveAndRole(defaultRole: 'clerk' | 'admin' | 'manager' | 'sales_rep' = 'clerk') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employee_id, user_id, role, reason, status }: { employee_id: string; user_id?: string | null; role?: 'clerk' | 'admin' | 'manager' | 'sales_rep'; reason?: string; status?: string }) => {
      const today = new Date().toISOString().split('T')[0];

      const { error: attendanceError } = await supabase
        .from('attendance')
        .upsert({
          employee_id,
          date: today,
          status: status || 'leave',
          notes: reason || 'Marked from HR page',
        }, { onConflict: 'employee_id,date' });

      if (attendanceError) throw attendanceError;

      if (user_id) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({
            user_id,
            role: role || defaultRole,
          }, { onConflict: 'user_id' });

        if (roleError) throw roleError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', new Date().toISOString().split('T')[0]] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Status and role updated');
    },
    onError: (error) => {
      toast.error('Failed to update status: ' + error.message);
    },
  });
}

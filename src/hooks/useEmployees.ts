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

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => {
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

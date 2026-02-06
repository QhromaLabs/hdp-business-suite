import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Plus, UserPlus2, Mail, Phone, Calendar as CalendarIcon, Briefcase, Shield, Lock, Key } from 'lucide-react';
import { useCreateEmployee, useUpdateEmployee, Employee } from '@/hooks/useEmployees';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeToEdit?: Employee | null;
}

const randomEmployeeNumber = () => `EMP-${Date.now().toString().slice(-6)}`;

export function AddEmployeeModal({ isOpen, onClose, employeeToEdit }: AddEmployeeModalProps) {
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();

  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState({
    employee_number: randomEmployeeNumber(),
    full_name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    role: '',
    basic_salary: '',
    hire_date: '',
  });

  const [createLogin, setCreateLogin] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (employeeToEdit) {
        setFormData({
          employee_number: employeeToEdit.employee_number,
          full_name: employeeToEdit.full_name,
          email: employeeToEdit.email || '',
          phone: employeeToEdit.phone || '',
          department: employeeToEdit.department || '',
          position: employeeToEdit.position || '',
          role: employeeToEdit.role || '',
          basic_salary: String(employeeToEdit.basic_salary ?? ''),
          hire_date: employeeToEdit.hire_date || '',
        });
        setCreateLogin(false);
      } else {
        setFormData(prev => ({ ...prev, employee_number: randomEmployeeNumber() }));
      }
    }
  }, [employeeToEdit, isOpen]);

  const { userRole } = useAuth();

  const availableRoles = userRole === 'manager'
    ? ['clerk', 'sales_rep', 'delivery_agent']
    : ['admin', 'manager', 'clerk', 'sales_rep', 'delivery_agent'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      if (employeeToEdit) {
        // Check if phone is being changed and if new phone is already in use by another active employee
        if (formData.phone && formData.phone !== employeeToEdit.phone) {
          const { data: existingPhone } = await supabase
            .from('employees')
            .select('id')
            .eq('phone', formData.phone)
            .eq('is_active', true)
            .maybeSingle();

          if (existingPhone) {
            throw new Error(`Phone number ${formData.phone} is already in use by another active employee.`);
          }
        }

        await updateEmployee.mutateAsync({
          id: employeeToEdit.id,
          user_id: employeeToEdit.user_id, // Pass user_id for role syncing
          employee_number: formData.employee_number,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          department: formData.department,
          position: formData.position,
          role: formData.role as any,
          basic_salary: Number(formData.basic_salary || 0),
          hire_date: formData.hire_date || null,
        });
      } else {
        // Check if phone is already in use by another active employee
        if (formData.phone) {
          const { data: existingPhone } = await supabase
            .from('employees')
            .select('id')
            .eq('phone', formData.phone)
            .eq('is_active', true)
            .maybeSingle();

          if (existingPhone) {
            throw new Error(`Phone number ${formData.phone} is already in use by another active employee.`);
          }
        }

        let userId = null;

        // 1. Optional: Create Auth User via RPC
        if (createLogin) {
          if (!formData.email || !password) {
            throw new Error("Email and password are required for login creation");
          }

          const { data: newUserId, error: rpcError } = await supabase.rpc('create_new_user' as any, {
            _email: formData.email,
            _password: password,
            _full_name: formData.full_name,
            _role: formData.role || 'clerk'
          });

          if (rpcError) throw rpcError;
          userId = newUserId;
        }

        // 2. Create Employee Record
        // @ts-ignore
        await createEmployee.mutateAsync({
          ...formData,
          role: formData.role as any,
          basic_salary: Number(formData.basic_salary || 0),
          hire_date: formData.hire_date || null,
          is_active: true,
          user_id: userId,
        });

        toast.success(`Employee ${formData.full_name} created successfully ${createLogin ? 'with system login' : ''}`);
      }

      onClose();
      // Reset form
      setFormData({
        employee_number: randomEmployeeNumber(),
        full_name: '',
        email: '',
        phone: '',
        department: '',
        position: '',
        role: '',
        basic_salary: '',
        hire_date: '',
      });


    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus2 className="w-4 h-4" />
            {employeeToEdit ? 'Edit Employee' : 'Onboard New Employee'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Employee Number</label>
              <input
                required
                value={formData.employee_number}
                onChange={(e) => setFormData(prev => ({ ...prev, employee_number: e.target.value }))}
                className="input-field"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <input
                required
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className="input-field"
                placeholder="Jane Doe"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="input-field pl-10"
                  placeholder="name@company.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    let value = e.target.value;
                    // Auto-add prefix if missing
                    if (!value.startsWith('+254')) {
                      const stripped = value.replace(/^\+?254|^0+/, '');
                      value = `+254${stripped}`;
                    }
                    // Remove leading '0' after prefix
                    if (value.startsWith('+2540')) {
                      value = `+254${value.substring(5)}`;
                    }
                    setFormData(prev => ({ ...prev, phone: value }));
                  }}
                  className="input-field pl-10"
                  placeholder="+2547..."
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <div className="relative">
                <Briefcase className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  className="input-field pl-10"
                  placeholder="Sales, Ops..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Position</label>
              <input
                value={formData.position}
                onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                className="input-field"
                placeholder="Manager"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">System Role</label>
              <div className="relative">
                <Shield className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  className="input-field pl-10 w-full"
                >
                  <option value="">No Role</option>
                  {availableRoles.map(r => (
                    <option key={r} value={r}>{r.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Basic Salary (KES)</label>
              <input
                required
                type="number"
                min={0}
                value={formData.basic_salary}
                onChange={(e) => setFormData(prev => ({ ...prev, basic_salary: e.target.value }))}
                className="input-field"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Hire Date</label>
              <div className="relative">
                <CalendarIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, hire_date: e.target.value }))}
                  className="input-field pl-10"
                />
              </div>
            </div>
          </div>

          {!employeeToEdit && (
            <div className="space-y-4 pt-4 border-t border-muted">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="createLogin"
                  checked={createLogin}
                  onChange={(e) => setCreateLogin(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="createLogin" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  Create system login for this employee
                </label>
              </div>

              {createLogin && (
                <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-top-1">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Initial Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        required={createLogin}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-field pl-10"
                        placeholder="••••••••"
                        minLength={6}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">The employee can change this after their first login.</p>
                  </div>
                </div>
              )}
            </div>
          )}



          <div className="pt-2">
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isProcessing || createEmployee.isPending || updateEmployee.isPending}
            >
              {(isProcessing || createEmployee.isPending || updateEmployee.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {employeeToEdit ? 'Save Changes' : 'Create Employee Record'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

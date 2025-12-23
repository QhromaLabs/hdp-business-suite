import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Plus, UserPlus2, Mail, Phone, Calendar as CalendarIcon, Briefcase, Shield } from 'lucide-react';
import { useCreateEmployee, useUpdateEmployee, Employee } from '@/hooks/useEmployees';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeToEdit?: Employee | null;
}

const randomEmployeeNumber = () => `EMP-${Date.now().toString().slice(-6)}`;

export function AddEmployeeModal({ isOpen, onClose, employeeToEdit }: AddEmployeeModalProps) {
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
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
      } else {
        setFormData(prev => ({ ...prev, employee_number: randomEmployeeNumber() }));
      }
    }
  }, [employeeToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (employeeToEdit) {
      await updateEmployee.mutateAsync({
        id: employeeToEdit.id,
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
      // @ts-ignore
      await createEmployee.mutateAsync({
        ...formData,
        role: formData.role as any,
        basic_salary: Number(formData.basic_salary || 0),
        hire_date: formData.hire_date || null,
        is_active: true,
        user_id: null,
        created_at: new Date().toISOString(),
      });
    }
    onClose();
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
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
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
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
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
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="clerk">Clerk</option>
                  <option value="sales_rep">Sales Rep</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="space-y-2 flex items-end">
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={createEmployee.isPending}
              >
                {createEmployee.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Save Employee
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

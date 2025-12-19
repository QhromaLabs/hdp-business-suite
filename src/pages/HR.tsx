import { 
  Users,
  DollarSign,
  UserCheck,
  Calendar,
  Loader2,
  UserX,
  Briefcase,
} from 'lucide-react';
import { useEmployees, useAttendanceToday, usePayrollSummary } from '@/hooks/useEmployees';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function HR() {
  const { data: employees = [], isLoading: employeesLoading } = useEmployees();
  const { data: attendanceToday = [], isLoading: attendanceLoading } = useAttendanceToday();
  const { data: payrollSummary, isLoading: payrollLoading } = usePayrollSummary();

  const isLoading = employeesLoading || attendanceLoading || payrollLoading;

  const presentCount = attendanceToday.filter(a => a.status === 'present').length;
  const absentCount = employees.length - attendanceToday.length;
  const fieldCount = attendanceToday.filter(a => a.status === 'field').length;
  const leaveCount = attendanceToday.filter(a => a.status === 'leave').length;

  const stats = [
    {
      title: 'Total Employees',
      value: employees.length,
      icon: Users,
      color: 'primary',
    },
    {
      title: 'Monthly Payroll',
      value: formatCurrency(payrollSummary?.netPayroll || employees.reduce((sum, e) => sum + Number(e.basic_salary), 0)),
      icon: DollarSign,
      color: 'success',
    },
    {
      title: 'Present Today',
      value: `${presentCount}/${employees.length}`,
      icon: UserCheck,
      color: 'warning',
    },
    {
      title: 'On Leave',
      value: leaveCount,
      icon: Calendar,
      color: 'destructive',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="stat-card animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  'p-3 rounded-xl',
                  stat.color === 'primary' && 'bg-primary/10 text-primary',
                  stat.color === 'success' && 'bg-success/10 text-success',
                  stat.color === 'warning' && 'bg-warning/10 text-warning',
                  stat.color === 'destructive' && 'bg-destructive/10 text-destructive',
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employees List */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Employee Directory</h3>
              <button className="btn-primary text-sm py-2">
                Add Employee
              </button>
            </div>
          </div>
          {employees.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No employees added yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">Employee</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">Department</th>
                    <th className="text-right py-3 px-6 text-sm font-medium text-muted-foreground">Salary</th>
                    <th className="text-center py-3 px-6 text-sm font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => {
                    const attendance = attendanceToday.find(a => a.employee_id === employee.id);
                    const status = attendance?.status || 'absent';
                    
                    return (
                      <tr key={employee.id} className="table-row">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-primary font-semibold">{employee.full_name.charAt(0)}</span>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{employee.full_name}</p>
                              <p className="text-sm text-muted-foreground">{employee.position || 'No position'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-foreground">{employee.department || 'Unassigned'}</span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="font-medium text-foreground">{formatCurrency(Number(employee.basic_salary))}</span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={cn(
                            'text-xs font-medium px-2.5 py-1 rounded-full',
                            status === 'present' && 'badge-success',
                            status === 'absent' && 'badge-destructive',
                            status === 'field' && 'badge-warning',
                            status === 'leave' && 'bg-muted text-muted-foreground',
                          )}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payroll Summary */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Payroll Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Base Salaries</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(payrollSummary?.totalSalaries || employees.reduce((sum, e) => sum + Number(e.basic_salary), 0))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Allowances</span>
                <span className="font-medium text-success">+{formatCurrency(payrollSummary?.allowances || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Deductions</span>
                <span className="font-medium text-destructive">-{formatCurrency(payrollSummary?.deductions || 0)}</span>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Net Payroll</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(payrollSummary?.netPayroll || employees.reduce((sum, e) => sum + Number(e.basic_salary), 0))}
                  </span>
                </div>
              </div>
            </div>
            <button className="btn-primary w-full mt-4">Process Payroll</button>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Today's Attendance</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-success/10 rounded-lg text-center">
                <UserCheck className="w-5 h-5 mx-auto text-success mb-1" />
                <p className="text-2xl font-bold text-success">{presentCount}</p>
                <p className="text-xs text-muted-foreground">Present</p>
              </div>
              <div className="p-3 bg-destructive/10 rounded-lg text-center">
                <UserX className="w-5 h-5 mx-auto text-destructive mb-1" />
                <p className="text-2xl font-bold text-destructive">{absentCount}</p>
                <p className="text-xs text-muted-foreground">Absent</p>
              </div>
              <div className="p-3 bg-warning/10 rounded-lg text-center">
                <Briefcase className="w-5 h-5 mx-auto text-warning mb-1" />
                <p className="text-2xl font-bold text-warning">{fieldCount}</p>
                <p className="text-xs text-muted-foreground">In Field</p>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <Calendar className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-2xl font-bold text-foreground">{leaveCount}</p>
                <p className="text-xs text-muted-foreground">On Leave</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

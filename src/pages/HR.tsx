import {
  Users,
  DollarSign,
  UserCheck,
  Calendar,
  UserX,
  Briefcase,
  Plus,
  Loader2,
  Pencil,
  UserCircle,
  Mail,
  Phone,
  Calendar as CalendarIcon,
  Trash2,
} from 'lucide-react';
import { useEmployees, useAttendanceToday, usePayrollSummary, useRunPayroll, usePayrollEntries, useMarkLeaveAndRole, useCreatePayrollEntry, useUpdateEmployee, useTerminateEmployee, Employee } from '@/hooks/useEmployees';
import { cn } from '@/lib/utils';
import { AddEmployeeModal } from '@/components/hr/AddEmployeeModal';
import { useState, useEffect } from 'react';
import { CardGridSkeleton, PageHeaderSkeleton, StatsSkeleton, TableSkeleton } from '@/components/loading/PageSkeletons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  const { data: payrollEntries = [] } = usePayrollEntries();
  const runPayroll = useRunPayroll();
  const createPayrollEntry = useCreatePayrollEntry();
  const markLeave = useMarkLeaveAndRole('clerk');
  const updateEmployee = useUpdateEmployee();
  const terminateEmployee = useTerminateEmployee();

  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    basic_salary: '',
    role: 'clerk' as 'admin' | 'manager' | 'clerk' | 'sales_rep',
    leaveReason: '',
  });

  useEffect(() => {
    if (viewingEmployee) {
      setProfileForm({
        full_name: viewingEmployee.full_name || '',
        email: viewingEmployee.email || '',
        phone: viewingEmployee.phone || '',
        department: viewingEmployee.department || '',
        position: viewingEmployee.position || '',
        basic_salary: String(viewingEmployee.basic_salary ?? ''),
        role: 'clerk',
        leaveReason: '',
      });
    }
  }, [viewingEmployee]);

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
      <div className="space-y-6 animate-fade-in">
        <PageHeaderSkeleton actions={1} />
        <StatsSkeleton />
        <CardGridSkeleton cards={6} />
        <TableSkeleton rows={5} columns={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      {/* Premium Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="group bg-card rounded-2xl border border-border/50 p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={cn(
                  'p-3 rounded-2xl transition-transform group-hover:scale-110 duration-500',
                  stat.color === 'primary' && 'bg-primary/10 text-primary',
                  stat.color === 'success' && 'bg-success/10 text-success',
                  stat.color === 'warning' && 'bg-warning/10 text-warning',
                  stat.color === 'destructive' && 'bg-destructive/10 text-destructive',
                )}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[8px] font-bold">
                      {String.fromCharCode(64 + i + index)}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-3xl font-semibold text-foreground tracking-tight">{stat.value}</p>
                <p className="text-sm font-medium text-muted-foreground mt-1">{stat.title}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Premium Employee Directory */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-semibold text-foreground">Employee Directory</h3>
                <p className="text-sm text-muted-foreground">Manage your workforce and positions</p>
              </div>
              <button
                onClick={() => {
                  setEmployeeToEdit(null);
                  setIsAddEmployeeOpen(true);
                }}
                className="btn-primary rounded-2xl shadow-lg premium-glow h-12 px-6"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add New Employee
              </button>
            </div>

            {employees.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-12">
                <Users className="w-16 h-16 opacity-30 mb-4" />
                <p className="font-bold">No active workforce</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {employees.map((employee, idx) => {
                  const attendance = attendanceToday.find(a => a.employee_id === employee.id);
                  const status = attendance?.status || 'absent';

                  return (
                    <button
                      key={employee.id}
                      onClick={() => setViewingEmployee(employee)}
                      className="group bg-card rounded-2xl border border-border/50 p-5 hover:border-primary/30 hover:shadow-xl transition-all duration-300 animate-slide-up w-full text-left"
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-xl font-semibold text-primary group-hover:scale-110 transition-transform duration-500 shadow-inner">
                            {employee.full_name.charAt(0)}
                          </div>
                          <div className={cn(
                            "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-card",
                            status === 'present' ? 'bg-success' : status === 'absent' ? 'bg-destructive' : 'bg-warning'
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{employee.full_name}</p>
                          <p className="text-xs font-medium text-muted-foreground opacity-90">{employee.position || 'Standard'}</p>
                          <p className="text-xs text-primary font-medium mt-1">{employee.department}</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold text-muted-foreground">Base Salary</p>
                          <p className="text-[14px] font-semibold text-foreground">{formatCurrency(Number(employee.basic_salary))}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Premium Payroll & Tracker */}
        <div className="space-y-6">
          <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner">
            <h3 className="text-xl font-semibold text-foreground mb-6">Payroll Ledger</h3>
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground opacity-70">Base Remuneration</span>
                <span className="text-sm font-semibold text-foreground">
                  {formatCurrency(payrollSummary?.totalSalaries || employees.reduce((sum, e) => sum + Number(e.basic_salary), 0))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground opacity-70">Total Allowances</span>
                <span className="text-sm font-semibold text-success">+{formatCurrency(payrollSummary?.allowances || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground opacity-70">Tax & Deductions</span>
                <span className="text-sm font-semibold text-destructive">-{formatCurrency(payrollSummary?.deductions || 0)}</span>
              </div>

              <div className="pt-6 border-t border-primary/20">
                <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-primary">Net Monthly Payout</span>
                    <DollarSign className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-3xl font-semibold text-primary">
                    {formatCurrency(payrollSummary?.netPayroll || employees.reduce((sum, e) => sum + Number(e.basic_salary), 0))}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => runPayroll.mutate()}
              className="btn-primary w-full mt-6 h-14 rounded-2xl font-semibold text-lg shadow-lg premium-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70"
              disabled={runPayroll.isPending}
            >
              {runPayroll.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                'RUN PAYROLL'
              )}
            </button>
          </div>

          <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-foreground">Individual Payroll</h3>
              <span className="text-xs text-muted-foreground">Latest 25 entries</span>
            </div>
            <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
              {payrollEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payroll entries yet.</p>
              ) : (
                payrollEntries.map((p) => (
                  <div key={p.id} className="p-4 rounded-2xl bg-card border border-border/50 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{p.employee?.full_name || 'Employee'}</p>
                      <p className="text-xs text-muted-foreground">{p.employee?.position || 'Staff'} • {p.pay_period_start} → {p.pay_period_end}</p>
                      <p className="text-xs text-muted-foreground">Logged: {new Date(p.pay_period_end).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(p.net_salary)}</p>
                      <span className={cn("text-[11px] px-2 py-1 rounded-full", p.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success')}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner">
            <h3 className="text-xl font-semibold text-foreground mb-6">Attendance Pulse</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="group p-5 bg-card border border-border/50 rounded-2xl text-center hover:border-success/30 transition-all">
                <UserCheck className="w-8 h-8 mx-auto text-success mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-3xl font-semibold text-success">{presentCount}</p>
                <p className="text-[10px] font-medium text-muted-foreground mt-1">Present</p>
              </div>
              <div className="group p-5 bg-card border border-border/50 rounded-2xl text-center hover:border-destructive/30 transition-all">
                <UserX className="w-8 h-8 mx-auto text-destructive mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-3xl font-semibold text-destructive">{absentCount}</p>
                <p className="text-[10px] font-medium text-muted-foreground mt-1">Absent</p>
              </div>
              <div className="group p-5 bg-card border border-border/50 rounded-2xl text-center hover:border-warning/30 transition-all">
                <Briefcase className="w-8 h-8 mx-auto text-warning mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-3xl font-semibold text-warning">{fieldCount}</p>
                <p className="text-[10px] font-medium text-muted-foreground mt-1">On Field</p>
              </div>
              <div className="group p-5 bg-card border border-border/50 rounded-2xl text-center hover:border-primary/30 transition-all">
                <Calendar className="w-8 h-8 mx-auto text-primary mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-3xl font-semibold text-primary">{leaveCount}</p>
                <p className="text-[10px] font-medium text-muted-foreground mt-1">Leave</p>
              </div>
            </div>
            <button className="w-full mt-6 py-4 bg-muted/30 rounded-2xl text-xs font-semibold text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all">
              View Calendar
            </button>
          </div>
        </div>
      </div>

      <AddEmployeeModal
        isOpen={isAddEmployeeOpen}
        employeeToEdit={employeeToEdit || undefined}
        onClose={() => {
          setIsAddEmployeeOpen(false);
          setEmployeeToEdit(null);
        }}
      />

      <Dialog open={!!viewingEmployee} onOpenChange={(open) => !open && setViewingEmployee(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <UserCircle className="w-5 h-5 text-primary" />
              {viewingEmployee?.full_name || 'Employee Profile'}
            </DialogTitle>
          </DialogHeader>
          {viewingEmployee && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                  <label className="text-xs text-muted-foreground">Full Name</label>
                  <input
                    className="input-field"
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                  />
                </div>
                <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                  <label className="text-xs text-muted-foreground">Salary</label>
                  <input
                    className="input-field"
                    type="number"
                    value={profileForm.basic_salary}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, basic_salary: e.target.value }))}
                  />
                </div>
                <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                  <label className="text-xs text-muted-foreground">Position</label>
                  <input
                    className="input-field"
                    value={profileForm.position}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, position: e.target.value }))}
                  />
                  <label className="text-xs text-muted-foreground mt-2">Department</label>
                  <input
                    className="input-field"
                    value={profileForm.department}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, department: e.target.value }))}
                  />
                </div>
                <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <input
                      className="input-field"
                      placeholder="Email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <input
                      className="input-field"
                      placeholder="Phone"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Hire: {viewingEmployee.hire_date || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border/60">
                <p className="text-xs text-muted-foreground mb-3">Recent Activity</p>
                <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                  {(() => {
                    const logs: { title: string; meta: string; time: string }[] = [];
                    const att = attendanceToday.find(a => a.employee_id === viewingEmployee.id);
                    if (att) {
                      logs.push({
                        title: `Attendance: ${att.status}`,
                        meta: att.notes || 'Marked today',
                        time: att.date,
                      });
                    }
                    const payroll = payrollEntries.find(p => p.employee_id === viewingEmployee.id);
                    if (payroll) {
                      logs.push({
                        title: `Payroll ${payroll.status}`,
                        meta: `Net: ${formatCurrency(payroll.net_salary)} (${payroll.pay_period_start}→${payroll.pay_period_end})`,
                        time: payroll.pay_period_end,
                      });
                    }
                    if (logs.length === 0) {
                      logs.push({ title: 'No recent activity', meta: 'Logs will appear here.', time: new Date().toISOString().split('T')[0] });
                    }
                    return logs.map((log, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/30">
                        <div>
                          <p className="font-semibold text-foreground">{log.title}</p>
                          <p className="text-xs text-muted-foreground">{log.meta}</p>
                        </div>
                        <span className="text-[11px] text-muted-foreground">{log.time}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-3">
                <p className="text-xs text-muted-foreground">Role & Status</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Role</label>
                    <select
                      className="input-field"
                      value={profileForm.role}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, role: e.target.value as any }))}
                    >
                      {['admin', 'manager', 'clerk', 'sales_rep'].map(r => (
                        <option key={r} value={r}>{r.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Leave Reason</label>
                    <input
                      className="input-field"
                      value={profileForm.leaveReason}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, leaveReason: e.target.value }))}
                      placeholder="e.g. Annual leave"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <button
                    className="btn-secondary justify-center"
                    onClick={() => {
                      if (!viewingEmployee) return;
                      updateEmployee.mutate({
                        id: viewingEmployee.id,
                        full_name: profileForm.full_name,
                        email: profileForm.email,
                        phone: profileForm.phone,
                        department: profileForm.department,
                        position: profileForm.position,
                        basic_salary: Number(profileForm.basic_salary || 0),
                      });
                    }}
                    disabled={updateEmployee.isPending}
                  >
                    Save Details
                  </button>
                  <button
                    className="btn-secondary justify-center"
                    onClick={() => {
                      if (!viewingEmployee) return;
                      createPayrollEntry.mutate({
                        employee_id: viewingEmployee.id,
                        basic_salary: Number(profileForm.basic_salary || viewingEmployee.basic_salary || 0),
                      });
                    }}
                    disabled={createPayrollEntry.isPending}
                  >
                    Record Payroll
                  </button>
                  <button
                    className="btn-secondary justify-center"
                    onClick={() => {
                      if (!viewingEmployee) return;
                      markLeave.mutate({
                        employee_id: viewingEmployee.id,
                        user_id: viewingEmployee.user_id,
                        role: profileForm.role as any,
                        reason: profileForm.leaveReason,
                        status: 'leave',
                      });
                    }}
                    disabled={markLeave.isPending}
                  >
                    Mark Leave
                  </button>
                  <div className="flex gap-2">
                    <button
                      className="btn-destructive justify-center w-full"
                      onClick={() => {
                        if (!viewingEmployee) return;
                        if (confirm('Terminate this employee? They will be marked inactive.')) {
                          terminateEmployee.mutate({ employee_id: viewingEmployee.id });
                          setViewingEmployee(null);
                        }
                      }}
                      disabled={terminateEmployee.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Terminate
                    </button>
                    <button
                      className="btn-primary justify-center w-full"
                      onClick={() => setViewingEmployee(null)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

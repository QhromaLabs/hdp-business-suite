
import {
  Users,
  UserCheck,
  Calendar,
  UserX,
  Briefcase,
  Plus,
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';
import { useEmployees, useAttendanceToday, Employee } from '@/hooks/useEmployees';
import { cn } from '@/lib/utils';
import { AddEmployeeModal } from '@/components/hr/AddEmployeeModal';
import { EmployeeDetailsModal } from '@/components/hr/EmployeeDetailsModal';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { CardGridSkeleton, PageHeaderSkeleton, StatsSkeleton } from '@/components/loading/PageSkeletons';

export default function HR() {
  const { data: allEmployees = [], isLoading: employeesLoading } = useEmployees(true); // Fetch all to filter manually
  const { data: attendanceToday = [], isLoading: attendanceLoading } = useAttendanceToday();

  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);

  const isLoading = employeesLoading || attendanceLoading;

  const activeEmployees = allEmployees.filter(e => e.is_active);
  const inactiveEmployees = allEmployees.filter(e => !e.is_active);

  const presentCount = attendanceToday.filter(a => ['present', 'field'].includes(a.status) && !a.check_out).length;
  const absentCount = activeEmployees.length - presentCount;
  const fieldCount = attendanceToday.filter(a => a.status === 'field').length;
  const leaveCount = attendanceToday.filter(a => a.status === 'leave').length;

  const stats = [
    {
      title: 'Total Employees',
      value: activeEmployees.length,
      icon: Users,
      color: 'primary',
      trend: `+${inactiveEmployees.length} inactive`,
    },
    {
      title: 'Present Today',
      value: `${presentCount}/${activeEmployees.length}`,
      icon: UserCheck,
      color: 'success',
      trend: '92%',
    },
    {
      title: 'Active in Field',
      value: fieldCount,
      icon: TrendingUp,
      color: 'warning',
      trend: 'Busy',
    },
    {
      title: 'On Leave',
      value: leaveCount,
      icon: Calendar,
      color: 'destructive',
      trend: activeEmployees.length > 0 ? `${Math.round((leaveCount / activeEmployees.length) * 100)}%` : '0%',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeaderSkeleton actions={1} />
        <StatsSkeleton />
        <CardGridSkeleton cards={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground">Manage your workforce directory and attendance</p>
        </div>
        <button
          onClick={() => {
            setEmployeeToEdit(null);
            setIsAddEmployeeOpen(true);
          }}
          className="btn-primary rounded-2xl shadow-lg premium-glow h-10 px-6"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Employee
        </button>
      </div>

      {/* Stats */}
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
                {stat.trend && (
                  <div className={cn(
                    "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full",
                    stat.color === 'primary' && 'bg-primary/10 text-primary',
                    stat.color === 'success' && 'bg-success/10 text-success',
                    stat.color === 'warning' && 'bg-warning/10 text-warning',
                    stat.color === 'destructive' && 'bg-destructive/10 text-destructive',
                  )}>
                    <ArrowUpRight className="w-3 h-3" />
                    {stat.trend}
                  </div>
                )}
              </div>
              <div>
                <p className="text-3xl font-semibold text-foreground tracking-tight">{stat.value}</p>
                <p className="text-sm font-medium text-muted-foreground mt-1">{stat.title}</p>
              </div>
            </div>
          );
        })}
      </div>

      <Tabs defaultValue="active" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-1">
            <TabsTrigger value="active" className="rounded-lg px-6">
              Active ({activeEmployees.length})
            </TabsTrigger>
            <TabsTrigger value="terminated" className="rounded-lg px-6">
              Terminated ({inactiveEmployees.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="active">
          <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner overflow-hidden flex flex-col">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-foreground">Active Workforce</h3>
            </div>
            {activeEmployees.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-12">
                <Users className="w-16 h-16 opacity-30 mb-4" />
                <p className="font-bold">No active workforce</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeEmployees.map((employee, idx) => {
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
                            ((status === 'present' || status === 'field') && !attendance?.check_out) ? 'bg-success' : status === 'absent' ? 'bg-destructive' : 'bg-warning'
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="font-semibold text-foreground truncate">{employee.full_name}</p>
                          </div>
                          <p className="text-xs font-medium text-muted-foreground opacity-90">{employee.position || 'Standard'}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-primary font-medium">{employee.department}</p>
                            {attendance && (
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded border border-border/30">
                                <span>IN: {attendance.check_in ? new Date(attendance.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                                {attendance.check_out && <span>OUT: {new Date(attendance.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="terminated">
          <div className="bg-card/20 backdrop-blur-md rounded-3xl border border-dashed border-border p-8 min-h-[400px]">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-muted-foreground">Inactive Records</h3>
              <p className="text-xs text-muted-foreground italic">These records are preserved for payroll & orders history.</p>
            </div>
            {inactiveEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20">
                <UserX className="w-12 h-12 opacity-20 mb-4" />
                <p>No inactive records</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75 grayscale-[0.5]">
                {inactiveEmployees.map((employee, idx) => (
                  <button
                    key={employee.id}
                    onClick={() => setViewingEmployee(employee)}
                    className="group bg-card/50 rounded-2xl border border-border/50 p-5 hover:bg-card transition-all duration-300 flex items-start gap-4 text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground">
                      {employee.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-muted-foreground truncate">{employee.full_name}</p>
                      <p className="text-[10px] text-muted-foreground opacity-70 italic">{employee.email || 'No Email'}</p>
                      <Badge variant="secondary" className="mt-2 text-[8px] h-4 px-1">TERMINATED</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AddEmployeeModal
        isOpen={isAddEmployeeOpen}
        employeeToEdit={employeeToEdit || undefined}
        onClose={() => {
          setIsAddEmployeeOpen(false);
          setEmployeeToEdit(null);
        }}
      />

      <EmployeeDetailsModal
        isOpen={!!viewingEmployee}
        employee={viewingEmployee}
        onClose={() => setViewingEmployee(null)}
      />
    </div>
  );
}

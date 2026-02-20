
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
import { CardGridSkeleton, PageHeaderSkeleton, StatsSkeleton } from '@/components/loading/PageSkeletons';

export default function HR() {
  const { data: employees = [], isLoading: employeesLoading } = useEmployees();
  const { data: attendanceToday = [], isLoading: attendanceLoading } = useAttendanceToday();

  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);

  const isLoading = employeesLoading || attendanceLoading;

  const presentCount = attendanceToday.filter(a => ['present', 'field'].includes(a.status)).length;
  const absentCount = employees.length - presentCount;
  const fieldCount = attendanceToday.filter(a => a.status === 'field').length;
  const leaveCount = attendanceToday.filter(a => a.status === 'leave').length;

  const stats = [
    {
      title: 'Total Employees',
      value: employees.length,
      icon: Users,
      color: 'primary',
      trend: '+2.5%',
    },
    {
      title: 'Present Today',
      value: `${presentCount}/${employees.length}`,
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
      trend: `${Math.round((leaveCount / employees.length) * 100)}%`,
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

      <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner overflow-hidden flex flex-col">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-foreground">Employee Directory</h3>
        </div>
        {employees.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-12">
            <Users className="w-16 h-16 opacity-30 mb-4" />
            <p className="font-bold">No active workforce</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        (status === 'present' || status === 'field') ? 'bg-success' : status === 'absent' ? 'bg-destructive' : 'bg-warning'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="font-semibold text-foreground truncate">{employee.full_name}</p>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground opacity-90">{employee.position || 'Standard'}</p>
                      <p className="text-xs text-primary font-medium mt-1">{employee.department}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

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

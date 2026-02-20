
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Mail,
    Phone,
    Calendar as CalendarIcon,
    Trash2,
    UserCircle,
    UserCheck,
    Briefcase,
    Calendar,
    Wallet,
    Banknote,
    Clock
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Employee, useAttendanceToday, useEmployeeAttendance, usePayrollEntries, useUpdateEmployee, useMarkLeaveAndRole, useCreatePayrollEntry, useTerminateEmployee } from '@/hooks/useEmployees';
import { useDeleteUser } from '@/hooks/useSettings';
import { useCommissions, useWithdrawalRequests } from '@/hooks/useCommissions';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0,
    }).format(amount);
};

const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    try {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return isoString;
    }
};

interface EmployeeDetailsModalProps {
    employee: Employee | null;
    isOpen: boolean;
    onClose: () => void;
}

export function EmployeeDetailsModal({ employee, isOpen, onClose }: EmployeeDetailsModalProps) {
    const { data: attendanceToday = [] } = useAttendanceToday();
    const { data: attendanceHistory = [], isLoading: historyLoading } = useEmployeeAttendance(employee?.id);
    const { data: payrollEntries = [] } = usePayrollEntries();

    // Commission Hooks
    const { data: commissions = [] } = useCommissions();
    const { data: withdrawals = [] } = useWithdrawalRequests();

    const updateEmployee = useUpdateEmployee();
    const terminateEmployee = useTerminateEmployee();
    const deleteUser = useDeleteUser();
    const createPayrollEntry = useCreatePayrollEntry();
    const markLeave = useMarkLeaveAndRole('clerk'); // Default role, overridden in function

    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; employeeId: string | null; userId: string | null }>({
        isOpen: false,
        employeeId: null,
        userId: null,
    });

    const [profileForm, setProfileForm] = useState({
        full_name: '',
        email: '',
        phone: '',
        department: '',
        position: '',
        basic_salary: '',
        role: 'clerk' as any,
        leaveReason: '',
    });

    useEffect(() => {
        if (employee) {
            setProfileForm({
                full_name: employee.full_name || '',
                email: employee.email || '',
                phone: employee.phone || '',
                department: employee.department || '',
                position: employee.position || '',
                basic_salary: String(employee.basic_salary ?? ''),
                role: (employee.role as any) || 'clerk',
                leaveReason: '',
            });
        }
    }, [employee]);

    if (!employee) return null;

    const availableRoles = ['admin', 'manager', 'clerk', 'sales_rep', 'delivery_agent'];
    const employeeAttendance = attendanceToday.find(a => a.employee_id === employee.id);
    const employeePayroll = payrollEntries.filter(p => p.employee_id === employee.id);
    const employeeCommissions = commissions.filter(c => c.sales_agent_id === employee.id);
    const employeeWithdrawals = withdrawals.filter(w => w.sales_agent_id === employee.id);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-xl">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-lg font-bold text-primary">{employee.full_name.charAt(0)}</span>
                            </div>
                            <div>
                                <p>{employee.full_name}</p>
                                <p className="text-xs font-normal text-muted-foreground">{employee.position} • {employee.department}</p>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    <Tabs defaultValue="overview" className="mt-4">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="financials">Payroll & Commissions</TabsTrigger>
                            <TabsTrigger value="activity">Activity & Logs</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Contact Info</label>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                                            <Mail className="w-4 h-4 text-muted-foreground" />
                                            <input
                                                className="bg-transparent text-sm w-full focus:outline-none"
                                                value={profileForm.email}
                                                onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                                                placeholder="Email Address"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                                            <Phone className="w-4 h-4 text-muted-foreground" />
                                            <input
                                                className="bg-transparent text-sm w-full focus:outline-none"
                                                value={profileForm.phone}
                                                onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                                                placeholder="Phone Number"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Employment</label>
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-3 bg-muted/50 rounded-lg">
                                                <p className="text-xs text-muted-foreground">Base Salary</p>
                                                <input
                                                    className="bg-transparent font-semibold text-sm w-full focus:outline-none"
                                                    type="number"
                                                    value={profileForm.basic_salary}
                                                    onChange={(e) => setProfileForm(prev => ({ ...prev, basic_salary: e.target.value }))}
                                                />
                                            </div>
                                            <div className="p-3 bg-muted/50 rounded-lg">
                                                <p className="text-xs text-muted-foreground">Role</p>
                                                <select
                                                    className="bg-transparent font-medium text-sm w-full focus:outline-none"
                                                    value={profileForm.role}
                                                    onChange={(e) => setProfileForm(prev => ({ ...prev, role: e.target.value }))}
                                                >
                                                    {availableRoles.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                                            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm">Hire Date: {employee.hire_date || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t flex justify-end gap-2">
                                <button
                                    className="btn-destructive text-xs"
                                    onClick={() => setDeleteConfirmation({
                                        isOpen: true,
                                        employeeId: employee.id,
                                        userId: employee.user_id || null
                                    })}
                                >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Terminate / Delete
                                </button>
                                <button
                                    className="btn-primary text-xs"
                                    onClick={() => {
                                        updateEmployee.mutate({
                                            id: employee.id,
                                            full_name: profileForm.full_name,
                                            email: profileForm.email,
                                            phone: profileForm.phone,
                                            department: profileForm.department,
                                            position: profileForm.position,
                                            basic_salary: Number(profileForm.basic_salary || 0),
                                            role: profileForm.role,
                                            user_id: employee.user_id,
                                        });
                                    }}
                                    disabled={updateEmployee.isPending}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </TabsContent>

                        <TabsContent value="financials" className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Wallet className="w-4 h-4 text-primary" />
                                        <p className="text-xs font-semibold text-primary uppercase">Total Salary Paid</p>
                                    </div>
                                    <p className="text-2xl font-bold text-primary">
                                        {formatCurrency(employeePayroll.reduce((sum, p) => sum + Number(p.net_salary), 0))}
                                    </p>
                                </div>
                                <div className="p-4 bg-success/5 rounded-xl border border-success/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Banknote className="w-4 h-4 text-success" />
                                        <p className="text-xs font-semibold text-success uppercase">Total Commission Earned</p>
                                    </div>
                                    <p className="text-2xl font-bold text-success">
                                        {formatCurrency(employeeCommissions.reduce((sum, c) => sum + Number(c.amount), 0))}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold">Latest Transactions</h4>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                    {employeePayroll.slice(0, 5).map(p => (
                                        <div key={p.id} className="flex justify-between items-center p-3 text-sm bg-muted/40 rounded-lg">
                                            <span>Salary ({p.pay_period_end})</span>
                                            <span className="font-mono">{formatCurrency(p.net_salary)}</span>
                                        </div>
                                    ))}
                                    {employeeWithdrawals.slice(0, 5).map(w => (
                                        <div key={w.id} className="flex justify-between items-center p-3 text-sm bg-muted/40 rounded-lg">
                                            <span>Withdrawal ({new Date(w.requested_at).toLocaleDateString()})</span>
                                            <span className="font-mono text-success">{formatCurrency(w.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="activity" className="space-y-4 py-4">
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-card border border-border/60">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-sm font-semibold">Attendance History</h4>
                                        <Badge variant="outline" className="text-[10px] uppercase">Last 30 Days</Badge>
                                    </div>

                                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                        {historyLoading ? (
                                            <div className="text-center py-4 text-muted-foreground text-xs italic">Loading history...</div>
                                        ) : attendanceHistory.length > 0 ? (
                                            attendanceHistory.map(record => (
                                                <div key={record.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full shrink-0",
                                                        record.status === 'present' ? 'bg-success' :
                                                            record.status === 'leave' ? 'bg-warning' : 'bg-muted'
                                                    )} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start">
                                                            <p className="text-xs font-semibold">{new Date(record.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                                                            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 uppercase font-bold">
                                                                {record.status}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-4 mt-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock className="w-3 h-3 text-muted-foreground" />
                                                                <span className="text-[10px] text-muted-foreground">IN: {formatTime(record.check_in)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock className="w-3 h-3 text-muted-foreground" />
                                                                <span className="text-[10px] text-muted-foreground">OUT: {formatTime(record.check_out)}</span>
                                                            </div>
                                                        </div>
                                                        {record.notes && (
                                                            <p className="text-[10px] text-muted-foreground italic mt-1.5 border-t border-border/30 pt-1">
                                                                "{record.notes}"
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-center py-4 text-sm text-muted-foreground">No attendance records found.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            <ConfirmDeleteDialog
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, employeeId: null, userId: null })}
                onConfirm={() => {
                    if (deleteConfirmation.userId) {
                        deleteUser.mutate(deleteConfirmation.userId);
                    } else if (deleteConfirmation.employeeId) {
                        terminateEmployee.mutate({ employee_id: deleteConfirmation.employeeId });
                    }
                    onClose(); // Close parent modal too
                }}
                isDeleting={deleteUser.isPending || terminateEmployee.isPending}
                title="Terminate Employee?"
                description="This action will remove access and mark the employee as inactive."
            />
        </>
    );
}

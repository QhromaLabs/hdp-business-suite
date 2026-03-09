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
    Clock,
    Lock,
    Key,
    Shield as ShieldIcon,
    Loader2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Employee, useAttendanceToday, useEmployeeAttendance, useEmployeeAttendanceLogs, usePayrollEntries, useUpdateEmployee, useMarkLeaveAndRole, useCreatePayrollEntry, useTerminateEmployee, useRestoreEmployee, useDeleteEmployeeHard, useUpdateUserPassword } from '@/hooks/useEmployees';
import { useDeleteUser } from '@/hooks/useSettings';
import { useCommissions, useWithdrawalRequests } from '@/hooks/useCommissions';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';

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
    const { data: attendanceLogs = [], isLoading: logsLoading } = useEmployeeAttendanceLogs(employee?.id);
    const { data: payrollEntries = [] } = usePayrollEntries();

    // Commission Hooks
    const { data: commissions = [] } = useCommissions();
    const { data: withdrawals = [] } = useWithdrawalRequests();

    const updateEmployee = useUpdateEmployee();
    const terminateEmployee = useTerminateEmployee();
    const deleteUser = useDeleteUser();
    const createPayrollEntry = useCreatePayrollEntry();
    const markLeave = useMarkLeaveAndRole('clerk'); // Default role, overridden in function
    const restoreEmployee = useRestoreEmployee();
    const hardDeleteEmployee = useDeleteEmployeeHard();

    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        isOpen: boolean;
        type: 'terminate' | 'hard-delete';
        employeeId: string | null;
        userId: string | null
    }>({
        isOpen: false,
        type: 'terminate',
        employeeId: null,
    });

    const [passwordForm, setPasswordForm] = useState({
        newPassword: '',
        isUpdating: false
    });

    const updateAuthPassword = useUpdateUserPassword();

    // Check for existing system account if not linked
    const { data: existingProfile, refetch: checkProfile } = useQuery({
        queryKey: ['profile_lookup', employee?.email],
        enabled: !!employee && !employee.user_id && !!employee.email,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email')
                .eq('email', employee!.email)
                .maybeSingle();

            if (error) throw error;
            return data;
        }
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

                            {employee.user_id && (
                                <div className="space-y-3 pt-4 border-t border-border/50">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                                        <ShieldIcon className="w-3 h-3" /> Security & Login
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                                            <Lock className="w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="password"
                                                className="bg-transparent text-sm w-full focus:outline-none"
                                                value={passwordForm.newPassword}
                                                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                                placeholder="Set New Password"
                                                minLength={6}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            className="btn-primary py-3 px-4 text-xs whitespace-nowrap"
                                            onClick={async () => {
                                                if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
                                                    toast.error("Password must be at least 6 characters");
                                                    return;
                                                }
                                                setPasswordForm(prev => ({ ...prev, isUpdating: true }));
                                                try {
                                                    await updateAuthPassword.mutateAsync({
                                                        userId: employee.user_id!,
                                                        password: passwordForm.newPassword
                                                    });
                                                    setPasswordForm({ newPassword: '', isUpdating: false });
                                                } catch (err) {
                                                    setPasswordForm(prev => ({ ...prev, isUpdating: false }));
                                                }
                                            }}
                                            disabled={passwordForm.isUpdating || updateAuthPassword.isPending || !passwordForm.newPassword}
                                        >
                                            {passwordForm.isUpdating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Key className="w-3 h-3 mr-1" />}
                                            Update Password
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic px-1">
                                        This will update the login password for {employee.full_name}'s system account.
                                    </p>
                                </div>
                            )}

                            {!employee.user_id && existingProfile && (
                                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3 mt-4">
                                    <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                                        <ShieldIcon className="w-4 h-4" />
                                        System account found!
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        A login account with email <strong>{employee.email}</strong> exists but isn't linked to this employee record.
                                        Link it to enable password resets and system access.
                                    </p>
                                    <button
                                        className="btn-primary w-full text-xs py-2"
                                        onClick={() => {
                                            updateEmployee.mutate({
                                                id: employee.id,
                                                user_id: existingProfile.id
                                            }, {
                                                onSuccess: () => {
                                                    checkProfile();
                                                }
                                            });
                                        }}
                                        disabled={updateEmployee.isPending}
                                    >
                                        Link System Account
                                    </button>
                                </div>
                            )}

                            <div className="pt-4 border-t flex justify-end gap-2">
                                {employee.is_active ? (
                                    <button
                                        className="btn-destructive text-xs"
                                        onClick={() => setDeleteConfirmation({
                                            isOpen: true,
                                            type: 'terminate',
                                            employeeId: employee.id,
                                            userId: employee.user_id || null
                                        })}
                                    >
                                        <Trash2 className="w-3 h-3 mr-1" />
                                        Terminate / Delete Login
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            className="btn-destructive variant-outline text-xs"
                                            onClick={() => setDeleteConfirmation({
                                                isOpen: true,
                                                type: 'hard-delete',
                                                employeeId: employee.id,
                                                userId: employee.user_id || null
                                            })}
                                        >
                                            <Trash2 className="w-3 h-3 mr-1" />
                                            Permanently Delete Record
                                        </button>
                                        <button
                                            className="btn-primary variant-outline text-xs"
                                            onClick={() => restoreEmployee.mutate({ employee_id: employee.id })}
                                            disabled={restoreEmployee.isPending}
                                        >
                                            <UserCheck className="w-3 h-3 mr-1" />
                                            Restore Employee
                                        </button>
                                    </>
                                )}
                                {employee.is_active && (
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
                                )}
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

                                <div className="p-4 rounded-xl bg-card border border-border/60 mt-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-sm font-semibold">Raw Activity Logs</h4>
                                        <Badge variant="outline" className="text-[10px] uppercase">All Events</Badge>
                                    </div>
                                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                        {logsLoading ? (
                                            <div className="text-center py-4 text-muted-foreground text-xs italic">Loading logs...</div>
                                        ) : attendanceLogs.length > 0 ? (
                                            attendanceLogs.map(log => (
                                                <div key={log.id} className="flex justify-between items-center p-3 text-sm bg-muted/20 border border-border/30 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        {log.action === 'clock_in' ? (
                                                            <div className="w-8 h-8 rounded-full bg-success/10 text-success flex items-center justify-center">
                                                                <Clock className="w-4 h-4" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-warning/10 text-warning flex items-center justify-center">
                                                                <Clock className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-semibold">{log.action === 'clock_in' ? 'Clocked In' : log.action === 'clock_out' ? 'Clocked Out' : 'Auto Clock Out'}</p>
                                                            <p className="text-[10px] text-muted-foreground">{new Date(log.timestamp).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                        </div>
                                                    </div>
                                                    <div className="font-mono text-xs font-semibold bg-background border border-border/40 px-2 py-1 rounded shadow-sm text-foreground">
                                                        {formatTime(log.timestamp)}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-center py-4 text-sm text-muted-foreground">No granular activity logs found.</p>
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
                onClose={() => setDeleteConfirmation({ isOpen: false, type: 'terminate', employeeId: null, userId: null })}
                onConfirm={() => {
                    if (deleteConfirmation.type === 'hard-delete') {
                        hardDeleteEmployee.mutate(deleteConfirmation.employeeId!);
                    } else if (deleteConfirmation.userId) {
                        deleteUser.mutate(deleteConfirmation.userId);
                    } else if (deleteConfirmation.employeeId) {
                        terminateEmployee.mutate({ employee_id: deleteConfirmation.employeeId });
                    }
                    onClose(); // Close parent modal too
                }}
                isDeleting={deleteUser.isPending || terminateEmployee.isPending || hardDeleteEmployee.isPending}
                title={deleteConfirmation.type === 'hard-delete' ? "Permanently Delete?" : "Terminate Employee?"}
                description={deleteConfirmation.type === 'hard-delete'
                    ? "This will permanently remove the employee and all their associated history (payroll, attendance, commissions). This cannot be undone."
                    : "This action will remove access and mark the employee as inactive."}
            />
        </>
    );
}

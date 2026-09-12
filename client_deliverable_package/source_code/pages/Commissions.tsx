
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeaderSkeleton, TableSkeleton } from '@/components/loading/PageSkeletons';
import { useCommissions, useWithdrawalRequests, useUpdateWithdrawalStatus } from '@/hooks/useCommissions';
import { Banknote, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0,
    }).format(amount);
};

export default function Commissions() {
    const { data: commissions = [], isLoading: commissionsLoading } = useCommissions();
    const { data: withdrawals = [], isLoading: withdrawalsLoading } = useWithdrawalRequests();
    const updateWithdrawal = useUpdateWithdrawalStatus();

    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
    const [notes, setNotes] = useState('');

    const isLoading = commissionsLoading || withdrawalsLoading;

    // Stats
    const totalCommissions = commissions.reduce((sum, c) => sum + Number(c.amount), 0);
    const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
    const totalPendingWithdrawalAmount = pendingWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);
    const paidWithdrawals = withdrawals.filter(w => w.status === 'paid' || w.status === 'approved').reduce((sum, w) => sum + Number(w.amount), 0);


    const handleAction = async () => {
        if (!selectedRequest || !actionType) return;

        const status = actionType === 'approve' ? 'paid' : 'rejected'; // Immediately 'paid' or just 'approved'? Requirement says "Approve/Pay" so maybe 'paid' directly for MVP expense sync

        updateWithdrawal.mutate({
            id: selectedRequest.id,
            status: status,
            notes: notes
        }, {
            onSuccess: () => {
                setSelectedRequest(null);
                setActionType(null);
                setNotes('');
            }
        });
    };

    if (isLoading) {
        return (
            <div className="space-y-6 animate-fade-in text-left"> {/* Added text-left to ensure alignment */}
                <PageHeaderSkeleton actions={1} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="h-32 bg-muted/20 rounded-xl animate-pulse" />
                    <div className="h-32 bg-muted/20 rounded-xl animate-pulse" />
                    <div className="h-32 bg-muted/20 rounded-xl animate-pulse" />
                </div>
                <TableSkeleton rows={5} columns={5} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in text-left">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Commissions</h1>
                    <p className="text-sm text-muted-foreground">Manage sales agent earnings and withdrawals</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Commissions Generated</CardTitle>
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalCommissions)}</div>
                        <p className="text-xs text-muted-foreground">Lifetime earnings across all agents</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                        <Clock className="h-4 w-4 text-warning" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalPendingWithdrawalAmount)}</div>
                        <p className="text-xs text-muted-foreground">{pendingWithdrawals.length} request(s) waiting</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Paid Out</CardTitle>
                        <CheckCircle className="h-4 w-4 text-success" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(paidWithdrawals)}</div>
                        <p className="text-xs text-muted-foreground">Successful withdrawals</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="withdrawals" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="withdrawals">Withdrawal Requests</TabsTrigger>
                    <TabsTrigger value="commissions">Commission Log</TabsTrigger>
                </TabsList>

                <TabsContent value="withdrawals" className="space-y-4">
                    <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle>Withdrawal Requests</CardTitle>
                            <CardDescription>Approve or reject agent withdrawal requests.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Agent</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Phone</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {withdrawals.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center">
                                                    No withdrawal requests found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            withdrawals.map((request) => (
                                                <TableRow key={request.id}>
                                                    <TableCell>{new Date(request.requested_at).toLocaleDateString()}</TableCell>
                                                    <TableCell className="font-medium">{request.sales_agent?.full_name || 'Unknown'}</TableCell>
                                                    <TableCell>{formatCurrency(request.amount)}</TableCell>
                                                    <TableCell>{request.phone_number}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={cn(
                                                            request.status === 'paid' && "bg-success/10 text-success border-success/20",
                                                            request.status === 'approved' && "bg-blue-500/10 text-blue-500 border-blue-500/20",
                                                            request.status === 'pending' && "bg-warning/10 text-warning border-warning/20",
                                                            request.status === 'rejected' && "bg-destructive/10 text-destructive border-destructive/20",
                                                        )}>
                                                            {request.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right space-x-2">
                                                        {request.status === 'pending' && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-8 border-success/30 text-success hover:bg-success hover:text-white"
                                                                    onClick={() => {
                                                                        setSelectedRequest(request);
                                                                        setActionType('approve');
                                                                    }}
                                                                >
                                                                    Pay
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-8 border-destructive/30 text-destructive hover:bg-destructive hover:text-white"
                                                                    onClick={() => {
                                                                        setSelectedRequest(request);
                                                                        setActionType('reject');
                                                                    }}
                                                                >
                                                                    Reject
                                                                </Button>
                                                            </>
                                                        )}
                                                        {request.status !== 'pending' && (
                                                            <span className="text-xs text-muted-foreground italic">
                                                                Processed {request.processed_at ? new Date(request.processed_at).toLocaleDateString() : ''}
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="commissions" className="space-y-4">
                    <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle>Commission Log</CardTitle>
                            <CardDescription>History of commissions earned per order.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Agent</TableHead>
                                            <TableHead>Order #</TableHead>
                                            <TableHead>Order Total</TableHead>
                                            <TableHead className="text-right">Commission (1%)</TableHead>
                                            <TableHead className="text-right">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {commissions.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center">
                                                    No commissions recorded.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            commissions.map((comm) => (
                                                <TableRow key={comm.id}>
                                                    <TableCell>{new Date(comm.created_at).toLocaleDateString()}</TableCell>
                                                    <TableCell className="font-medium">{comm.sales_agent?.full_name}</TableCell>
                                                    <TableCell>{comm.order?.order_number}</TableCell>
                                                    <TableCell>{formatCurrency(comm.order?.total_amount || 0)}</TableCell>
                                                    <TableCell className="text-right font-bold">{formatCurrency(comm.amount)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant="secondary" className="text-xs">
                                                            {comm.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === 'approve' ? 'Approve & Pay Withdrawal' : 'Reject Withdrawal'}
                        </DialogTitle>
                        <DialogDescription>
                            {actionType === 'approve'
                                ? `You are about to mark this withdrawal of ${formatCurrency(selectedRequest?.amount)} as PAID. This will automatically create an expense entry.`
                                : `You are rejecting this withdrawal request. Please provide a reason.`
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium">Notes / Reference (Optional)</label>
                            <Textarea
                                placeholder={actionType === 'approve' ? "e.g., MPESA Ref: QWE12345" : "Reason for rejection..."}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedRequest(null)}>Cancel</Button>
                        <Button
                            variant={actionType === 'approve' ? 'default' : 'destructive'}
                            onClick={handleAction}
                            disabled={updateWithdrawal.isPending}
                        >
                            {updateWithdrawal.isPending ? 'Processing...' : 'Confirm'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

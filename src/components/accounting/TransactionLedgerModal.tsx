import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownRight, X, Filter, Download, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Transaction {
    id: string;
    type: 'income' | 'expense';
    category: string;
    amount: number;
    date: string;
    description?: string;
}

interface TransactionLedgerModalProps {
    open: boolean;
    onClose: () => void;
    transactions: Transaction[];
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0,
    }).format(amount);
};

export default function TransactionLedgerModal({ open, onClose, transactions }: TransactionLedgerModalProps) {
    const [isFilterExpanded, setIsFilterExpanded] = useState(false);
    const [filters, setFilters] = useState({
        type: 'all',
        category: 'all',
        dateFrom: '',
        dateTo: '',
        minAmount: '',
        maxAmount: '',
        search: ''
    });

    // Get unique categories
    const categories = useMemo(() => {
        const cats = new Set(transactions.map(t => t.category));
        return Array.from(cats).sort();
    }, [transactions]);

    // Apply filters
    const filteredTransactions = useMemo(() => {
        return transactions.filter(txn => {
            // Type filter
            if (filters.type !== 'all' && txn.type !== filters.type) return false;

            // Category filter
            if (filters.category !== 'all' && txn.category !== filters.category) return false;

            // Date range filter
            if (filters.dateFrom && new Date(txn.date) < new Date(filters.dateFrom)) return false;
            if (filters.dateTo && new Date(txn.date) > new Date(filters.dateTo)) return false;

            // Amount range filter
            if (filters.minAmount && txn.amount < Number(filters.minAmount)) return false;
            if (filters.maxAmount && txn.amount > Number(filters.maxAmount)) return false;

            // Search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesCategory = txn.category.toLowerCase().includes(searchLower);
                const matchesDescription = txn.description?.toLowerCase().includes(searchLower);
                if (!matchesCategory && !matchesDescription) return false;
            }

            return true;
        });
    }, [transactions, filters]);

    // Calculate summary stats
    const summary = useMemo(() => {
        const totalIncome = filteredTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpense = filteredTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            totalIncome,
            totalExpense,
            netFlow: totalIncome - totalExpense,
            count: filteredTransactions.length
        };
    }, [filteredTransactions]);

    const clearFilters = () => {
        setFilters({
            type: 'all',
            category: 'all',
            dateFrom: '',
            dateTo: '',
            minAmount: '',
            maxAmount: '',
            search: ''
        });
    };

    const exportToCSV = () => {
        // Create CSV header
        const headers = ['Date', 'Type', 'Category', 'Description', 'Amount'];

        // Create CSV rows from filtered transactions
        const rows = filteredTransactions.map(txn => [
            new Date(txn.date).toLocaleDateString('en-KE', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }),
            txn.type === 'income' ? 'Income' : 'Expense',
            txn.category,
            txn.description || '',
            txn.amount.toString()
        ]);

        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Complete Transaction Ledger</DialogTitle>
                </DialogHeader>

                {/* Filters Section - Collapsible with Smooth Animation */}
                <div className="bg-muted/30 rounded-xl border border-border/50 overflow-hidden">
                    <button
                        onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-semibold text-foreground">Filters</span>
                            {!isFilterExpanded && (
                                <span className="text-xs text-muted-foreground transition-opacity duration-200">
                                    ({Object.values(filters).filter(v => v && v !== 'all').length} active)
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {isFilterExpanded && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); clearFilters(); }}
                                    className="transition-opacity duration-200"
                                >
                                    Clear All
                                </Button>
                            )}
                            <ChevronDown className={cn(
                                "w-4 h-4 text-muted-foreground transition-transform duration-300 ease-in-out",
                                isFilterExpanded && "rotate-180"
                            )} />
                        </div>
                    </button>

                    {/* Collapsible Content with Grid Animation */}
                    <div className={cn(
                        "grid transition-all duration-300 ease-in-out",
                        isFilterExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    )}>
                        <div className="overflow-hidden">
                            <div className={cn(
                                "p-4 pt-0 pb-4 transition-opacity duration-200",
                                isFilterExpanded ? "opacity-100 delay-100" : "opacity-0"
                            )}>
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {/* Type Filter */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">Type</label>
                                        <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                                            <SelectTrigger className="h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Types</SelectItem>
                                                <SelectItem value="income">Income Only</SelectItem>
                                                <SelectItem value="expense">Expense Only</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Category Filter */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">Category</label>
                                        <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                                            <SelectTrigger className="h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Categories</SelectItem>
                                                {categories.map(cat => (
                                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Date From */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">From Date</label>
                                        <Input
                                            type="date"
                                            className="h-9"
                                            value={filters.dateFrom}
                                            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                                        />
                                    </div>

                                    {/* Date To */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">To Date</label>
                                        <Input
                                            type="date"
                                            className="h-9"
                                            value={filters.dateTo}
                                            onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                                        />
                                    </div>

                                    {/* Min Amount */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">Min Amount</label>
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            className="h-9"
                                            value={filters.minAmount}
                                            onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                                        />
                                    </div>

                                    {/* Max Amount */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">Max Amount</label>
                                        <Input
                                            type="number"
                                            placeholder="∞"
                                            className="h-9"
                                            value={filters.maxAmount}
                                            onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                                        />
                                    </div>

                                    {/* Search */}
                                    <div className="space-y-1 md:col-span-2">
                                        <label className="text-xs font-medium text-muted-foreground">Search</label>
                                        <Input
                                            placeholder="Search category or description..."
                                            className="h-9"
                                            value={filters.search}
                                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-3">
                    <div className="bg-card border border-border/50 rounded-xl p-3">
                        <p className="text-xs text-muted-foreground">Total Transactions</p>
                        <p className="text-xl font-bold text-foreground">{summary.count}</p>
                    </div>
                    <div className="bg-success/5 border border-success/20 rounded-xl p-3">
                        <p className="text-xs text-success">Total Income</p>
                        <p className="text-xl font-bold text-success">{formatCurrency(summary.totalIncome)}</p>
                    </div>
                    <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3">
                        <p className="text-xs text-destructive">Total Expense</p>
                        <p className="text-xl font-bold text-destructive">{formatCurrency(summary.totalExpense)}</p>
                    </div>
                    <div className={cn(
                        "border rounded-xl p-3",
                        summary.netFlow >= 0 ? "bg-primary/5 border-primary/20" : "bg-warning/5 border-warning/20"
                    )}>
                        <p className="text-xs text-muted-foreground">Net Flow</p>
                        <p className={cn(
                            "text-xl font-bold",
                            summary.netFlow >= 0 ? "text-primary" : "text-warning"
                        )}>
                            {formatCurrency(summary.netFlow)}
                        </p>
                    </div>
                </div>

                {/* Transaction List */}
                <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin space-y-2">
                    {filteredTransactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <p className="text-sm font-medium">No transactions match your filters</p>
                            <Button variant="link" onClick={clearFilters} className="mt-2">
                                Clear filters
                            </Button>
                        </div>
                    ) : (
                        filteredTransactions.map((txn) => {
                            const isIncome = txn.type === 'income';
                            return (
                                <div
                                    key={txn.id}
                                    className="group flex items-center justify-between p-4 bg-card rounded-xl border border-border/50 hover:border-primary/30 transition-all"
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={cn(
                                            'w-10 h-10 rounded-xl flex items-center justify-center shadow-inner flex-shrink-0',
                                            isIncome ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                                        )}>
                                            {isIncome ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-semibold text-foreground">{txn.category}</p>
                                                <span className={cn(
                                                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                                    isIncome ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                                                )}>
                                                    {isIncome ? 'Income' : 'Expense'}
                                                </span>
                                            </div>
                                            {txn.description && (
                                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{txn.description}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-4">
                                        <p className={cn(
                                            'text-base font-bold',
                                            isIncome ? 'text-success' : 'text-destructive'
                                        )}>
                                            {isIncome ? '+' : '-'}{formatCurrency(txn.amount)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(txn.date).toLocaleDateString('en-KE', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">
                        Showing {filteredTransactions.length} of {transactions.length} transactions
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={exportToCSV}>
                            <Download className="w-4 h-4 mr-2" />
                            Export CSV
                        </Button>
                        <Button onClick={onClose}>Close</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

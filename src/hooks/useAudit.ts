import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type AuditType = 'stock' | 'money' | 'production';
export type AuditStatus = 'pending_review' | 'explained' | 'resolved' | 'approved';

export type AuditEntry = {
  id: string;
  action: string;
  details: string;
  user: string;
  timestamp: string;
  type: AuditType;
  status: AuditStatus;
  lossValue?: number;
  recoveredValue?: number;
  reference?: string;
};

type StockAuditRow = Database['public']['Tables']['stock_audits']['Row'];
type AuditLogRow = Database['public']['Tables']['audit_logs']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type BankTransactionRow = Database['public']['Tables']['bank_transactions']['Row'];
type ExpenseRow = Database['public']['Tables']['expenses']['Row'];

type StockAuditWithVariant = StockAuditRow & {
  variant?: {
    id?: string;
    sku?: string | null;
    variant_name?: string;
    cost_price?: number | null;
    product?: {
      name?: string | null;
      category?: { name?: string | null } | null;
    } | null;
  } | null;
};

const tableTypeMap: Record<string, AuditType> = {
  stock_audits: 'stock',
  inventory: 'stock',
  inventory_transactions: 'stock',
  payments: 'money',
  expenses: 'money',
  creditor_transactions: 'money',
  production_runs: 'production',
  production_materials: 'production',
};

const getStatusFromAction = (action?: string | null, status?: string | null): AuditStatus => {
  if (status === 'approved') return 'approved';
  if (status === 'resolved') return 'resolved';
  if (status === 'explained') return 'explained';
  if (status === 'pending_review') return 'pending_review';

  switch (action) {
    case 'approve': return 'approved';
    case 'reject': return 'pending_review';
    case 'delete': return 'resolved';
    case 'update': return 'resolved';
    case 'create': return 'resolved';
    default: return 'pending_review';
  }
};

const formatActionLabel = (action?: string | null, tableName?: string | null) => {
  const readableAction = action ? `${action.charAt(0).toUpperCase()}${action.slice(1)}` : 'Update';
  const readableTable = tableName ? tableName.replace(/_/g, ' ') : 'record';
  return `${readableAction} ${readableTable}`;
};

const fallbackUser = (profileMap: Map<string, string>, userId?: string | null) => {
  if (!userId) return 'System';
  return profileMap.get(userId) || userId;
};

export function useAuditLogs() {
  return useQuery({
    queryKey: ['audit_logs'],
    queryFn: async () => {
      const [
        stockAuditResult,
        auditLogResult,
        profileResult,
        bankTxnResult,
        expenseResult,
      ] = await Promise.all([
        supabase
          .from('stock_audits')
          .select(`
            id,
            created_at,
            status,
            difference,
            system_quantity,
            actual_quantity,
            reason,
            audited_by,
            approved_by,
            variant:product_variants(
              id,
              sku,
              variant_name,
              cost_price,
              product:products(
                name,
                category:product_categories(name)
              )
            )
          `)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('audit_logs')
          .select('id, created_at, action, table_name, record_id, user_id')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('profiles')
          .select('id, full_name'),
        supabase
          .from('bank_transactions')
          .select('id, transaction_type, amount, transaction_date, description, reference_number, is_reconciled')
          .order('transaction_date', { ascending: false })
          .limit(50),
        supabase
          .from('expenses')
          .select('id, category, description, amount, expense_date, reference_number')
          .order('expense_date', { ascending: false })
          .limit(50),
      ]);

      if (stockAuditResult.error) throw stockAuditResult.error;
      if (auditLogResult.error) throw auditLogResult.error;
      if (profileResult.error) throw profileResult.error;
      if (bankTxnResult.error) throw bankTxnResult.error;
      if (expenseResult.error) throw expenseResult.error;

      const profileMap = new Map<string, string>(
        (profileResult.data as ProfileRow[] | null)?.map((p) => [p.id, p.full_name]) || []
      );

      const stockEntries: AuditEntry[] = (stockAuditResult.data as StockAuditWithVariant[] | null || []).map((row) => {
        const quantityDiff = Number(row.difference) || 0;
        const unitCost = Number(row.variant?.cost_price || 0);
        const valueImpact = Math.abs(quantityDiff) * unitCost;
        const productName = row.variant?.product?.name;
        const variantName = row.variant?.variant_name;

        const details = row.reason
          || `${productName || 'Product'} ${variantName ? `(${variantName}) ` : ''}- System: ${row.system_quantity}, Actual: ${row.actual_quantity}`;

        return {
          id: row.id,
          action: 'Stock Audit',
          details,
          user: fallbackUser(profileMap, row.audited_by),
          timestamp: row.created_at || '',
          type: 'stock',
          status: getStatusFromAction(undefined, row.status),
          lossValue: quantityDiff < 0 ? valueImpact : 0,
          recoveredValue: quantityDiff > 0 ? valueImpact : 0,
          reference: row.variant?.sku || row.variant?.product?.category?.name || undefined,
        };
      });

      const generalEntries: AuditEntry[] = (auditLogResult.data as AuditLogRow[] | null || []).map((log) => {
        const type = tableTypeMap[log.table_name || ''] || 'stock';
        const label = formatActionLabel(log.action, log.table_name);
        const status = getStatusFromAction(log.action, undefined);

        const details = log.record_id
          ? `${label} — record ${log.record_id}`
          : label;

        return {
          id: log.id,
          action: label,
          details,
          user: fallbackUser(profileMap, log.user_id),
          timestamp: log.created_at || '',
          type,
          status,
          reference: log.table_name || undefined,
        };
      });

      const bankEntries: AuditEntry[] = (bankTxnResult.data as BankTransactionRow[] | null || []).map((txn) => {
        const isCredit = (txn.transaction_type || '').toLowerCase().includes('credit') ||
          (txn.transaction_type || '').toLowerCase().includes('deposit') ||
          (txn.transaction_type || '').toLowerCase().includes('receive');
        const amount = Number(txn.amount || 0);
        return {
          id: txn.id,
          action: isCredit ? 'Cash Inflow' : 'Cash Outflow',
          details: txn.description || 'Bank transaction',
          user: 'System',
          timestamp: txn.transaction_date || '',
          type: 'money',
          status: txn.is_reconciled ? 'resolved' : 'pending_review',
          lossValue: isCredit ? 0 : amount,
          recoveredValue: isCredit ? amount : 0,
          reference: txn.reference_number || undefined,
        };
      });

      const expenseEntries: AuditEntry[] = (expenseResult.data as ExpenseRow[] | null || []).map((exp) => ({
        id: exp.id,
        action: 'Expense Recorded',
        details: `${exp.category}: ${exp.description || 'No description'}`,
        user: 'System',
        timestamp: exp.expense_date || '',
        type: 'money',
        status: 'resolved',
        lossValue: Number(exp.amount || 0),
        reference: exp.reference_number || undefined,
      }));

      return [...stockEntries, ...generalEntries, ...bankEntries, ...expenseEntries].sort((a, b) => {
        const timeA = new Date(a.timestamp || '').getTime() || 0;
        const timeB = new Date(b.timestamp || '').getTime() || 0;
        return timeB - timeA;
      });
    },
    staleTime: 60_000,
  });
}

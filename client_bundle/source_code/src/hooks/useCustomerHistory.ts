import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type HistoryItem = {
    id: string;
    date: string;
    type: 'purchase' | 'payment' | 'adjustment' | 'return';
    amount: number;
    description: string;
    reference?: string | null;
    status?: string;
};

export function useCustomerHistory(customerId: string) {
    return useQuery({
        queryKey: ['customer_history', customerId],
        queryFn: async () => {
            if (!customerId) return [];

            const [
                { data: orders, error: ordersError },
                { data: payments, error: paymentsError },
                { data: adjustments, error: adjustmentsError },
                { data: returns, error: returnsError }
            ] = await Promise.all([
                supabase
                    .from('sales_orders')
                    .select('id, created_at, total_amount, order_number, status')
                    .eq('customer_id', customerId)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('payments')
                    .select('id, created_at, amount, payment_method, notes')
                    .eq('customer_id', customerId)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('customer_adjustments')
                    .select('id, created_at, amount, reason')
                    .eq('customer_id', customerId)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('product_returns')
                    .select('id, created_at, refund_amount, return_number, reason')
                    .eq('customer_id', customerId)
                    .order('created_at', { ascending: false })
            ]);

            if (ordersError) throw ordersError;
            if (paymentsError) throw paymentsError;
            if (adjustmentsError) throw adjustmentsError;
            if (returnsError) throw returnsError;

            const history: HistoryItem[] = [];

            // 1. Purchases (Increases Debt)
            orders?.forEach(order => {
                history.push({
                    id: order.id,
                    date: order.created_at,
                    type: 'purchase',
                    amount: order.total_amount, // Positive because it counts towards volume, but logic-wise it increases debt
                    description: `Order #${order.order_number}`,
                    reference: order.order_number,
                    status: order.status
                });
            });

            // 2. Payments (Reduces Debt)
            payments?.forEach(payment => {
                // Ignore negative payments which are refunds handled by returns logic, 
                // OR we display them as refunds if that's preferred.
                // However, since we now have a dedicated 'returns' table, specific return records are better.
                // But wait, the previous logic inserted negative payments for Cash Refunds.
                // So we might duplicates if we show both. 
                // Decision: Show negative payments as "Refund Execution" or similar, 
                // but the `product_returns` record is the "Return Event".

                // Let's filter out negative payments if we want to rely on the Return Record for display,
                // OR display them as 'Refund Paid out'. 
                // Since the user said "it didn't log it", they probably expect to see the "Return" itself.

                history.push({
                    id: payment.id,
                    date: payment.created_at!,
                    type: 'payment',
                    amount: payment.amount,
                    description: payment.amount < 0 ? `Refund (${payment.payment_method})` : `Payment via ${payment.payment_method}`,
                    reference: payment.notes
                });
            });

            // 3. Adjustments (Manual Change)
            adjustments?.forEach(adj => {
                history.push({
                    id: adj.id,
                    date: adj.created_at,
                    type: 'adjustment',
                    amount: adj.amount,
                    description: adj.reason || 'Manual Adjustment',
                });
            });

            // 4. Returns (Reduces Debt or is Neutral if refunded cash)
            returns?.forEach(ret => {
                history.push({
                    id: ret.id,
                    date: ret.created_at,
                    type: 'return',
                    amount: Number(ret.refund_amount),
                    description: `Return #${ret.return_number}`,
                    reference: ret.reason
                });
            });

            // Sort by date descending
            return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        },
        enabled: !!customerId
    });
}

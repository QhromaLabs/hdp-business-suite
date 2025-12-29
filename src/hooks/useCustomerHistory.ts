import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type HistoryItem = {
    id: string;
    date: string;
    type: 'purchase' | 'payment' | 'adjustment';
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
                { data: adjustments, error: adjustmentsError }
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
                    .order('created_at', { ascending: false })
            ]);

            if (ordersError) throw ordersError;
            if (paymentsError) throw paymentsError;
            if (adjustmentsError) throw adjustmentsError;

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
                history.push({
                    id: payment.id,
                    date: payment.created_at!,
                    type: 'payment',
                    amount: payment.amount,
                    description: `Payment via ${payment.payment_method}`,
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

            // Sort by date descending
            return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        },
        enabled: !!customerId
    });
}

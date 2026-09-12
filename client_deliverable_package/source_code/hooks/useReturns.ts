import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type PaymentMethod = Database['public']['Enums']['payment_method'];

interface ReturnItem {
    variantId: string;
    quantity: number;
    price: number; // This is the refund amount per unit
}

interface CreateReturnPayload {
    customerId: string;
    items: ReturnItem[];
    reason: string;
    notes: string;
    refundMethod: PaymentMethod;
    refundAmount: number;
}

export function useCreateProductReturn() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateReturnPayload) => {
            // 1. Create Return Record
            const { data: returnRecord, error: returnError } = await supabase
                .from('product_returns')
                .insert({
                    customer_id: payload.customerId,
                    reason: payload.reason,
                    notes: payload.notes,
                    refund_amount: payload.refundAmount,
                    refund_method: payload.refundMethod,
                })
                .select()
                .single();

            if (returnError) throw returnError;

            // 2. Create Return Items
            const returnItems = payload.items.map(item => ({
                return_id: returnRecord.id,
                variant_id: item.variantId,
                quantity: item.quantity,
                unit_refund_amount: item.price,
                condition: 'resellable'
            }));

            const { error: itemsError } = await supabase
                .from('product_return_items')
                .insert(returnItems);

            if (itemsError) throw itemsError;

            // 3. Update Inventory & Log Transaction
            for (const item of payload.items) {
                // Fetch current stock
                const { data: invData } = await supabase
                    .from('inventory')
                    .select('quantity, id')
                    .eq('variant_id', item.variantId)
                    .single();

                if (invData) {
                    const newQty = (invData.quantity || 0) + item.quantity;

                    // Update Inventory
                    await supabase
                        .from('inventory')
                        .update({ quantity: newQty })
                        .eq('variant_id', item.variantId);

                    // Log Transaction
                    await supabase
                        .from('inventory_transactions')
                        .insert({
                            variant_id: item.variantId,
                            quantity_change: item.quantity,
                            transaction_type: 'return', // Ensure this maps to string if not enum, or add to enum if it exists
                            previous_quantity: invData.quantity || 0,
                            new_quantity: newQty,
                            notes: `Return #${returnRecord.return_number} - ${payload.reason}`,
                            reference_id: returnRecord.id, // Linking to return record
                            reference_type: 'product_returns'
                        });
                }
            }

            // 4. Handle Refund
            if (payload.refundMethod === 'credit') {
                // Fetch Customer Balance
                const { data: customer } = await supabase
                    .from('customers')
                    .select('credit_balance')
                    .eq('id', payload.customerId)
                    .single();

                const newBalance = (customer?.credit_balance || 0) + payload.refundAmount;

                // Update Customer
                const { error: creditError } = await supabase
                    .from('customers')
                    .update({ credit_balance: newBalance })
                    .eq('id', payload.customerId);

                if (creditError) throw creditError;

            } else {
                // Record as a "Negative Payment" (Refund)
                // Or we could have a separate `refunds` table, but using negative payment is a common pattern for simple ledgers.
                // Let's check `payments` table constraint. `amount` is likely numeric.
                // POS.tsx uses `payments` table insert for cash sales.
                const { error: paymentError } = await supabase
                    .from('payments')
                    .insert({
                        order_id: null, // No sales order directly linked, or could link to return if we add column. For now null is fine.
                        customer_id: payload.customerId,
                        amount: -Math.abs(payload.refundAmount), // Negative amount
                        payment_method: payload.refundMethod,
                        status: 'completed' // Assuming status column exists
                    });

                if (paymentError) {
                    console.error('Failed to log refund payment:', paymentError);
                    // Verify if `payments` table allows negative? Most likely yes for numeric.
                }
            }

            return returnRecord;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            // Invalidate sales/payments if needed
            toast.success('Return processed successfully!');
        },
        onError: (error) => {
            console.error('Return processing error:', error);
            toast.error('Failed to process return: ' + error.message);
        }
    });
}

export function useProductReturns(options?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
}) {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 25;

    return useQuery({
        queryKey: ['product_returns', options?.startDate, options?.endDate, page, pageSize],
        queryFn: async () => {
            let query = supabase
                .from('product_returns')
                .select(`
                    *,
                    customer:customers(name)
                `, { count: 'exact' })
                .order('created_at', { ascending: false });

            if (options?.startDate) {
                query = query.gte('created_at', options.startDate);
            }

            if (options?.endDate) {
                const endDatePlusOne = new Date(options.endDate);
                endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
                query = query.lt('created_at', endDatePlusOne.toISOString());
            }

            const offset = (page - 1) * pageSize;
            console.log('Fetching returns with offset:', offset, 'pageSize:', pageSize);
            query = query.range(offset, offset + pageSize - 1);

            const { data, error, count } = await query;

            if (error) {
                console.error('Error fetching returns:', error);
                throw error;
            }

            return {
                returns: data,
                totalCount: count || 0
            };
        },
    });
}

export function useReturnItems(returnId: string) {
    return useQuery({
        queryKey: ['return_items', returnId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('product_return_items')
                .select(`
                    *,
                    variant: product_variants (
                        *,
                        product: products (*)
                    )
                `)
                .eq('return_id', returnId);

            if (error) throw error;
            return data;
        },
        enabled: !!returnId
    });
}

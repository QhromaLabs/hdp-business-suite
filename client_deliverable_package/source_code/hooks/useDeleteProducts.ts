import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useDeleteProducts() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ ids, hardDelete = false }: { ids: string[], hardDelete?: boolean }) => {
            if (hardDelete) {
                // Get all variant IDs for these products
                const { data: variants } = await supabase
                    .from('product_variants')
                    .select('id')
                    .in('product_id', ids);

                const variantIds = variants?.map(v => v.id) || [];

                if (variantIds.length > 0) {
                    // Delete in order of dependencies
                    await supabase.from('inventory_transactions').delete().in('variant_id', variantIds);
                    await supabase.from('inventory').delete().in('variant_id', variantIds);
                    await supabase.from('sales_order_items').delete().in('variant_id', variantIds);
                    await supabase.from('consignment_returns').delete().in('variant_id', variantIds);
                    await supabase.from('stock_audits').delete().in('variant_id', variantIds);
                    // Also delete from production_runs if applicable
                    await supabase.from('production_runs').delete().in('variant_id', variantIds);
                }

                // Delete variants
                const { error: variantError } = await supabase
                    .from('product_variants')
                    .delete()
                    .in('product_id', ids);
                if (variantError) throw variantError;

                // Delete products
                const { error: productError } = await supabase
                    .from('products')
                    .delete()
                    .in('id', ids);
                if (productError) throw productError;
            } else {
                // Soft-delete
                const { error: variantError } = await supabase
                    .from('product_variants')
                    .update({ is_active: false })
                    .in('product_id', ids);
                if (variantError) throw variantError;

                const { error: productError } = await supabase
                    .from('products')
                    .update({ is_active: false })
                    .in('id', ids);
                if (productError) throw productError;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['product_variants'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            toast.success('Products deleted successfully');
        },
        onError: (error: any) => {
            toast.error('Failed to delete products: ' + error.message);
        },
    });
}

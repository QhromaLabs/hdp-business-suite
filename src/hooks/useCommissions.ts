
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface Commission {
    id: string;
    order_id: string;
    sales_agent_id: string;
    amount: number;
    status: 'pending' | 'paid';
    created_at: string;
    sales_agent?: {
        full_name: string;
    };
    order?: {
        order_number: string;
        total_amount: number;
    };
}

export interface WithdrawalRequest {
    id: string;
    sales_agent_id: string;
    amount: number;
    phone_number: string;
    status: 'pending' | 'approved' | 'rejected' | 'paid';
    requested_at: string;
    processed_at?: string;
    notes?: string;
    sales_agent?: {
        full_name: string;
        phone: string;
    };
}

export const useCommissions = () => {
    return useQuery({
        queryKey: ['commissions'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sales_commissions')
                .select(`
          *,
          sales_agent:employees!sales_commissions_sales_agent_id_fkey(full_name),
          order:sales_orders!sales_commissions_order_id_fkey(order_number, total_amount)
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Commission[];
        },
    });
};

export const useWithdrawalRequests = () => {
    return useQuery({
        queryKey: ['withdrawal_requests'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('withdrawal_requests')
                .select(`
          *,
          sales_agent:employees(full_name, phone)
        `)
                .order('requested_at', { ascending: false });

            if (error) throw error;
            return data as WithdrawalRequest[];
        },
    });
};

export const useUpdateWithdrawalStatus = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
            const user = (await supabase.auth.getUser()).data.user;

            const { error } = await supabase
                .from('withdrawal_requests')
                .update({
                    status,
                    processed_at: new Date().toISOString(),
                    processed_by: user?.id,
                    notes
                })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['withdrawal_requests'] });
            queryClient.invalidateQueries({ queryKey: ['expenses'] }); // Expenses are synced triggers but good to invalidate
            toast({
                title: "Success",
                description: "Withdrawal request updated successfully",
            });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });
};

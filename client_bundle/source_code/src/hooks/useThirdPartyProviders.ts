import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ThirdPartyProvider {
    id: string;
    name: string;
    image_url?: string;
    phone?: string;
    email?: string;
    description?: string;
    is_active: boolean;
    created_at: string;
}

export function useThirdPartyProviders() {
    return useQuery({
        queryKey: ['third_party_providers'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('third_party_providers')
                .select('*')
                .order('name');
            if (error) throw error;
            return data as ThirdPartyProvider[];
        },
    });
}

export function useCreateThirdPartyProvider() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (provider: Partial<ThirdPartyProvider>) => {
            const { data, error } = await supabase
                .from('third_party_providers')
                .insert(provider)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['third_party_providers'] });
            toast.success('Provider added successfully');
        },
        onError: (error) => {
            toast.error('Failed to add provider: ' + error.message);
        },
    });
}

export function useUpdateThirdPartyProvider() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...provider }: Partial<ThirdPartyProvider> & { id: string }) => {
            const { data, error } = await supabase
                .from('third_party_providers')
                .update(provider)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['third_party_providers'] });
            toast.success('Provider updated successfully');
        },
        onError: (error) => {
            toast.error('Failed to update provider: ' + error.message);
        },
    });
}

export function useDeleteThirdPartyProvider() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('third_party_providers')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['third_party_providers'] });
            toast.success('Provider deleted successfully');
        },
        onError: (error) => {
            toast.error('Failed to delete provider: ' + error.message);
        },
    });
}

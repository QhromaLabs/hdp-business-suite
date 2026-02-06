import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DeliveryAgent {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
}

export function useDeliveryAgents() {
    return useQuery({
        queryKey: ['delivery_agents'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('employees')
                .select(`
          id,
          full_name,
          email,
          phone
        `)
                .eq('role', 'delivery_agent')
                .eq('is_active', true);

            if (error) throw error;
            return data as unknown as DeliveryAgent[];
        },
    });
}

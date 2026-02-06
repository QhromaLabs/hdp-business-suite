import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SalesOrder } from './useSalesOrders';
import { useEffect } from 'react';

export interface DeliveryLocation {
    user_id: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    profile?: {
        full_name: string;
    };
}

export function useDeliveries() {
    const queryClient = useQueryClient();

    // Subscribe to realtime changes for sales_orders
    useEffect(() => {
        const channel = supabase
            .channel('delivery_orders_realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'sales_orders' },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['active_deliveries'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    return useQuery({
        queryKey: ['active_deliveries'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sales_orders')
                .select(`
          *,
          customer:customers(name, phone, address_name, latitude, longitude),
          delivery_agent:employees!sales_orders_delivery_agent_id_fkey(id, full_name, phone, user_id)
        `)
                .in('status', ['dispatched', 'in_transit', 'delivered'])
                .order('dispatched_at', { ascending: false });

            if (error) throw error;
            return data as (SalesOrder & {
                delivery_agent?: { id: string; full_name: string; phone: string; user_id?: string };
            })[];
        },
    });
}

export function useAgentLocations() {
    const queryClient = useQueryClient();

    // Subscribe to realtime changes for user_locations
    useEffect(() => {
        const channel = supabase
            .channel('agent_locations_realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'user_locations' },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['agent_locations'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    return useQuery({
        queryKey: ['agent_locations'],
        queryFn: async () => {
            // Get the latest location for each active delivery agent
            const { data, error } = await supabase
                .from('user_locations')
                .select(`
          user_id,
          latitude,
          longitude,
          timestamp
        `)
                .order('timestamp', { ascending: false });

            if (error) throw error;

            // Get all employee names to match
            const { data: employees } = await supabase
                .from('employees')
                .select('id, full_name, user_id');

            // Filter to keep only the latest location per user
            const latestLocationsMap = new Map<string, any>();
            (data || []).forEach(loc => {
                if (!latestLocationsMap.has(loc.user_id)) {
                    // Find matching employee or profile name
                    const employee = (employees || []).find(e => e.id === loc.user_id || e.user_id === loc.user_id);
                    latestLocationsMap.set(loc.user_id, {
                        ...loc,
                        profile: { full_name: employee?.full_name || 'Unknown Agent' }
                    });
                }
            });

            return Array.from(latestLocationsMap.values()) as DeliveryLocation[];
        },
        refetchInterval: 2000, // Sync with mobile update rate (2s)
    });
}

export function useAgentBreadcrumbs(userId: string | null) {
    return useQuery({
        queryKey: ['agent_breadcrumbs', userId],
        queryFn: async () => {
            if (!userId) return [];

            const { data, error } = await supabase
                .from('user_locations')
                .select('latitude, longitude, timestamp')
                .eq('user_id', userId)
                .order('timestamp', { ascending: false })
                .limit(50);

            if (error) throw error;
            return (data || []).map(loc => [Number(loc.latitude), Number(loc.longitude)]) as [number, number][];
        },
        enabled: !!userId,
        refetchInterval: 2000,
    });
}

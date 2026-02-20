import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserLocation {
    id: string;
    user_id: string;
    latitude: number;
    longitude: number;
    timestamp: string;
}

export interface LocationRequest {
    id: string;
    sales_rep_id: string;
    status: 'pending' | 'responded' | 'timeout';
    requested_at: string;
    responded_at?: string;
}

export const useUserLocations = () => {
    return useQuery({
        queryKey: ['userLocations'],
        queryFn: async () => {
            // Get the latest location for each user
            // Note: This query assumes we want the absolute latest row per user.
            // A more complex query might be needed for perfect uniqueness if not handled by backend,
            // but for now we fetch recent locations.
            // Or we can fetch all and filter in JS for MVP.
            const { data, error } = await supabase
                .from('user_locations')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(100);

            if (error) throw error;

            // Filter to get only the latest per user
            const latestLocations = new Map<string, UserLocation>();
            data?.forEach((loc: any) => {
                if (!latestLocations.has(loc.user_id)) {
                    latestLocations.set(loc.user_id, loc);
                }
            });

            return Array.from(latestLocations.values());
        },
        refetchInterval: 30000, // Refresh every 30s
    });
};

export const useRecentLocationHistory = () => {
    return useQuery({
        queryKey: ['recentLocationHistory'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('user_locations')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(50);

            if (error) throw error;
            return data as UserLocation[];
        },
        refetchInterval: 30000,
    });
};

export const useLocationRequests = () => {
    return useQuery({
        queryKey: ['locationRequests'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('location_requests')
                .select('*')
                .order('requested_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            return data as LocationRequest[];
        }
    });
};

export const useRequestLocation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (salesRepId: string) => {
            // Check if there is already a pending request to avoid spamming
            const { data: existing } = await supabase
                .from('location_requests')
                .select('*')
                .eq('sales_rep_id', salesRepId)
                .eq('status', 'pending')
                .single();

            if (existing) throw new Error("A request is already pending for this user.");

            const { data, error } = await supabase
                .from('location_requests')
                .insert({ sales_rep_id: salesRepId })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locationRequests'] });
        },
    });
};

export const useSaveLocation = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ latitude, longitude }: { latitude: number; longitude: number }) => {
            if (!user) throw new Error('User not authenticated');

            const { error } = await supabase
                .from('user_locations')
                .insert({
                    user_id: user.id,
                    latitude,
                    longitude,
                    timestamp: new Date().toISOString()
                });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userLocations'] });
        },
        onError: (error) => {
            console.error('Error saving location:', error);
        }
    });
};

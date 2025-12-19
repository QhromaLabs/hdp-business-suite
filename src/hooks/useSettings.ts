import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

export type AppRole = Database['public']['Enums']['app_role'];

export interface ProfileWithRole {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  device_id: string | null;
  role: AppRole | null;
}

export function useUserRoles() {
  return useQuery({
    queryKey: ['user_roles_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          phone,
          device_id,
          user_roles: user_roles(role)
        `);

      if (error) throw error;

      return (data || []).map((p: any) => ({
        ...p,
        role: Array.isArray(p.user_roles) && p.user_roles.length > 0 ? p.user_roles[0].role : null,
      })) as ProfileWithRole[];
    },
  });
}

export function useUpsertUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id,
          role,
          assigned_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;
      return { user_id, role };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_roles_list'] });
      toast.success('Role updated');
    },
    onError: (error) => {
      toast.error('Failed to update role: ' + error.message);
    },
  });
}

export function useRemoveUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user_id }: { user_id: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user_id);

      if (error) throw error;
      return { user_id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_roles_list'] });
      toast.success('Role removed');
    },
    onError: (error) => {
      toast.error('Failed to remove role: ' + error.message);
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, full_name, phone, device_id }: { id: string; full_name: string; phone?: string | null; device_id?: string | null }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name,
          phone: phone || null,
          device_id: device_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      return { id, full_name, phone, device_id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_roles_list'] });
      toast.success('Profile updated');
    },
    onError: (error) => {
      toast.error('Failed to update profile: ' + error.message);
    },
  });
}

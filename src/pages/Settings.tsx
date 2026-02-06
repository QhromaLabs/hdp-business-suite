import { useState } from 'react';
import {
  Settings as SettingsIcon,
  Users,
  ShieldCheck,
  Bell,
  Smartphone,
  Mail,
  Key,
  Palette,
  Database,
  Receipt,
  Copy,
} from 'lucide-react';
import { useUserRoles, useRemoveUserRole, useUpsertUserRole, useDeleteUser, ProfileWithRole, AppRole } from '@/hooks/useSettings';
import { ManageRoleModal } from '@/components/settings/ManageRoleModal';
import { EditProfileModal } from '@/components/settings/EditProfileModal';
import { CardGridSkeleton, FormCardSkeleton, PageHeaderSkeleton, TableSkeleton } from '@/components/loading/PageSkeletons';
import { Switch } from '@/components/ui/switch';
import { useSettings } from '@/contexts/SettingsContext';

import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import { useEffect } from 'react';

function IpManagementSection() {
  const queryClient = useQueryClient();
  const [currentIp, setCurrentIp] = useState<string | null>(null);
  const [newIp, setNewIp] = useState('');

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setCurrentIp(data.ip))
      .catch(err => console.error('Failed to fetch IP', err));

    // Subscribe to realtime changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whitelisted_ips',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['whitelisted_ips'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: whitelistedIps, isLoading } = useQuery({
    queryKey: ['whitelisted_ips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whitelisted_ips')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addIp = useMutation({
    mutationFn: async (ip: string) => {
      const { error } = await supabase.from('whitelisted_ips').insert({ ip_address: ip });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whitelisted_ips'] });
      setNewIp('');
      toast.success('IP added to whitelist');
    },
    onError: (error) => toast.error('Failed to add IP: ' + error.message),
  });

  const removeIp = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('whitelisted_ips').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whitelisted_ips'] });
      toast.success('IP removed from whitelist');
    },
    onError: (error) => toast.error('Failed to remove IP: ' + error.message),
  });

  const handleAddCurrent = () => {
    if (currentIp) addIp.mutate(currentIp);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Current IP Card */}
        <div className="flex-1 p-4 rounded-lg bg-muted/30 border border-border">
          <p className="text-sm font-medium text-muted-foreground mb-1">Your Current IP Address</p>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">{currentIp || 'Loading...'}</h2>
            {currentIp && (
              <button
                onClick={() => navigator.clipboard.writeText(currentIp)}
                className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors"
              >
                Copy
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            This is the address verified by our system. Ensure this is whitelisted to maintain access.
            <a href="/my-ip" target="_blank" className="ml-1 text-primary hover:underline">
              Share public IP link
            </a>
          </p>
        </div>

        {/* Warning Card */}
        <div className="flex-1 p-4 rounded-lg bg-warning/10 border border-warning/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-warning-foreground text-sm">Strict Access Control</h4>
              <p className="text-xs text-warning-foreground/80 mt-1">
                Adding IPs to this list enables <strong>Strict Mode</strong>. Only devices with these IPs will be able to access the system.
                If the list is empty, access is open to everyone.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Whitelisted IP Addresses</h4>
          <div className="flex gap-2">
            {currentIp && (
              <button
                onClick={handleAddCurrent}
                disabled={addIp.isPending || whitelistedIps?.some(w => w.ip_address === currentIp)}
                className="btn-secondary h-9 text-xs"
              >
                {whitelistedIps?.some(w => w.ip_address === currentIp) ? 'Current IP Whitelisted' : 'Add Current IP'}
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter IP address manually (e.g., 192.168.1.1)"
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            className="input-field max-w-sm"
          />
          <button
            onClick={() => newIp && addIp.mutate(newIp)}
            disabled={!newIp || addIp.isPending}
            className="btn-primary h-10 w-10 p-0 flex items-center justify-center"
          >
            {addIp.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>

        <div className="rounded-md border border-border">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading whitelist...</div>
          ) : whitelistedIps?.length === 0 ? (
            <div className="p-8 text-center bg-muted/20">
              <p className="text-sm text-muted-foreground">No IPs whitelisted. System is legally valid for public access.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {whitelistedIps?.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <span className="font-mono text-sm">{item.ip_address}</span>
                    {item.ip_address === currentIp && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">YOU</span>
                    )}
                  </div>
                  <button
                    onClick={() => removeIp.mutate(item.id)}
                    disabled={removeIp.isPending}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    title="Remove IP"
                  >
                    {removeIp.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const { data: profiles = [], isLoading } = useUserRoles();
  const removeRole = useRemoveUserRole();
  const upsertRole = useUpsertUserRole();
  const deleteUser = useDeleteUser();
  const { taxEnabled, setTaxEnabled } = useSettings();
  const deviceLink = typeof window !== 'undefined' ? `${window.location.origin}/device-id` : '/device-id';
  const [selectedProfile, setSelectedProfile] = useState<ProfileWithRole | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; userId: string | null }>({
    isOpen: false,
    userId: null,
  });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all');
  const [notificationPrefs, setNotificationPrefs] = useState({
    email: true,
    sms: false,
    push: true,
  });

  const openDeviceModal = (profile?: ProfileWithRole | null) => {
    const chosenProfile = profile || profiles[0] || null;
    setSelectedProfile(chosenProfile);
    setIsProfileModalOpen(true);
  };

  const stats = [
    { label: 'Admins', value: profiles.filter(p => p.role === 'admin').length },
    { label: 'Managers', value: profiles.filter(p => p.role === 'manager').length },
    { label: 'Clerks', value: profiles.filter(p => p.role === 'clerk').length },
    { label: 'Sales Reps', value: profiles.filter(p => p.role === 'sales_rep').length },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeaderSkeleton actions={1} />
        <CardGridSkeleton cards={4} />
        <FormCardSkeleton fields={4} actionButtons={2} />
        <TableSkeleton rows={6} columns={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Settings</h2>
          <p className="text-muted-foreground">Manage access, notifications, and device policies</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <SettingsIcon className="w-4 h-4" />
          Control center
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 animate-slide-up"
            style={{ animationDelay: `${idx * 40}ms` }}
          >
            <ShieldCheck className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-semibold text-foreground">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Users & Roles</h3>
            </div>
            <button
              className="btn-primary h-10 rounded-lg"
              onClick={() => setIsRoleModalOpen(true)}
            >
              Assign Role
            </button>
          </div>
          <div className="divide-y divide-border">
            {profiles.map(profile => (
              <div key={profile.id} className="py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-semibold text-primary">
                    {profile.full_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{profile.full_name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {profile.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary capitalize">
                    {profile.role || 'unassigned'}
                  </span>
                  <button
                    className="btn-secondary h-8 text-xs"
                    onClick={() => {
                      setSelectedProfile(profile);
                      setIsRoleModalOpen(true);
                    }}
                  >
                    Change
                  </button>
                  <button
                    className="btn-secondary h-8 text-xs"
                    onClick={() => {
                      setSelectedProfile(profile);
                      setIsProfileModalOpen(true);
                    }}
                  >
                    Edit
                  </button>
                  {/* Delete Button (Permanent) */}
                  <button
                    className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-colors"
                    onClick={() => setDeleteConfirmation({ isOpen: true, userId: profile.id })}
                    title="Permanently Delete User"
                  >
                    <span className="sr-only">Delete</span>
                    ×
                  </button>
                </div>
              </div>
            ))}
            {profiles.length === 0 && (
              <div className="py-6 text-muted-foreground text-sm text-center">No users found.</div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Notifications</h3>
          </div>
          <div className="space-y-3">
            {[
              { key: 'email', label: 'Email alerts', description: 'Activity summaries and approvals' },
              { key: 'sms', label: 'SMS alerts', description: 'Critical system events' },
              { key: 'push', label: 'Push notifications', description: 'Mobile alerts for tasks' },
            ].map(item => (
              <label key={item.key} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={(notificationPrefs as any)[item.key]}
                  onChange={() => setNotificationPrefs(prev => ({ ...prev, [item.key]: !(prev as any)[item.key] }))}
                />
                <div>
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              <h4 className="font-semibold text-foreground">Device Policies</h4>
            </div>
            <p className="text-sm text-muted-foreground">Restrict logins to registered device IDs to secure POS and field apps.</p>

            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-2 text-sm">
              <p className="font-semibold text-foreground">Step 1: Share this link to capture Device ID (no login needed)</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-md bg-card border border-border text-foreground text-xs break-all">{deviceLink}</code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(deviceLink)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
                >
                  <Copy className="w-4 h-4" /> Copy
                </button>
              </div>
              <p className="text-muted-foreground">Ask the user to open that link on the device/browser they will use, copy the Device ID shown, and send it to you. Paste it into Authorized Device ID for their profile, then save (ID is unique per browser and persists unless they clear site data).</p>
            </div>

            <button
              className="btn-secondary w-fit"
              onClick={() => openDeviceModal()}
            >
              Register Device
            </button>

          </div>

          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              <h4 className="font-semibold text-foreground">Tax Settings</h4>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/30 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">Turn tax on</p>
                <p className="text-xs text-muted-foreground">When off, VAT is hidden and removed from new sales totals.</p>
              </div>
              <Switch
                checked={taxEnabled}
                onCheckedChange={(checked) => setTaxEnabled(checked)}
                aria-label="Toggle VAT"
              />
            </div>
          </div>
        </div>
      </div>

      {/* IP Management Section */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Access Control & Security</h3>
        </div>

        <IpManagementSection />
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Register Device', icon: Smartphone, action: () => openDeviceModal() },
            { label: 'API Keys', icon: Key },
            { label: 'Theme', icon: Palette },
            { label: 'System Logs', icon: Database },
          ].map((action) => {
            const ActionIcon = action.icon;
            return (
              <button
                key={action.label}
                onClick={action.action}
                className="p-4 bg-muted/30 rounded-xl flex flex-col items-center gap-2 hover:bg-muted/50 transition-colors"
              >
                <ActionIcon className="w-6 h-6 text-primary" />
                <span className="text-sm font-medium text-foreground">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <ManageRoleModal
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setSelectedProfile(null);
        }}
        profiles={profiles}
        selectedUserId={selectedProfile?.id}
      />
      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={selectedProfile}
      />

      <ConfirmDeleteDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, userId: null })}
        onConfirm={() => {
          if (deleteConfirmation.userId) {
            deleteUser.mutate(deleteConfirmation.userId);
            setDeleteConfirmation({ isOpen: false, userId: null });
          }
        }}
        isDeleting={deleteUser.isPending}
        title="Delete User Account?"
        description="This will permanently delete the user's login access and associated profile. They will need to sign up again to access the system."
      />
    </div>
  );
}

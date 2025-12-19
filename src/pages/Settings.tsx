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
} from 'lucide-react';
import { useUserRoles, useRemoveUserRole, ProfileWithRole } from '@/hooks/useSettings';
import { ManageRoleModal } from '@/components/settings/ManageRoleModal';
import { EditProfileModal } from '@/components/settings/EditProfileModal';
import { CardGridSkeleton, FormCardSkeleton, PageHeaderSkeleton, TableSkeleton } from '@/components/loading/PageSkeletons';

export default function Settings() {
  const { data: profiles = [], isLoading } = useUserRoles();
  const removeRole = useRemoveUserRole();
  const [selectedProfile, setSelectedProfile] = useState<ProfileWithRole | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState({
    email: true,
    sms: false,
    push: true,
  });

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
                  {profile.role && (
                    <button
                      className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-colors disabled:opacity-60"
                      onClick={() => removeRole.mutate({ user_id: profile.id })}
                      disabled={removeRole.isPending}
                    >
                      ×
                    </button>
                  )}
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
            <button
              className="btn-secondary w-fit"
              onClick={() => {
                setSelectedProfile(profiles[0] || null);
                setIsProfileModalOpen(true);
              }}
            >
              Register Device
            </button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Register Device', icon: Smartphone },
            { label: 'API Keys', icon: Key },
            { label: 'Theme', icon: Palette },
            { label: 'System Logs', icon: Database },
          ].map((action) => {
            const ActionIcon = action.icon;
            return (
              <button
                key={action.label}
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
    </div>
  );
}

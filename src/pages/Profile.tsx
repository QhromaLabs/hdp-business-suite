import { useAuth } from '@/contexts/AuthContext';
import { BadgeCheck, Mail, Phone, Shield, User, Activity, Clock, Smartphone, Save } from 'lucide-react';
import { CardGridSkeleton, PageHeaderSkeleton } from '@/components/loading/PageSkeletons';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Profile() {
  const { profile, userRole, isLoading } = useAuth();
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    phone: '',
    device_id: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        device_id: profile.device_id || '',
      });
    }
  }, [profile]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeaderSkeleton actions={1} />
        <CardGridSkeleton cards={3} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-16 text-center space-y-3">
        <Shield className="w-10 h-10 text-muted-foreground mx-auto" />
        <p className="text-lg font-semibold text-foreground">No profile found</p>
        <p className="text-sm text-muted-foreground">Sign in again or contact an admin.</p>
      </div>
    );
  }

  const quickChips = [
    { label: 'Role', value: userRole?.replace('_', ' ') || 'Unassigned', icon: Shield },
    { label: 'Status', value: 'Active', icon: BadgeCheck },
  ];

  return (
    <div className="space-y-6 animate-fade-in w-full">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border border-border rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold shadow-lg">
            {profileData.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{profileData.full_name}</h1>
            <p className="text-sm text-muted-foreground">{profileData.email}</p>
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 text-success text-xs font-semibold">
              <BadgeCheck className="w-4 h-4" />
              Verified Account
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {quickChips.map((chip) => {
            const Icon = chip.icon;
            return (
              <div key={chip.label} className="px-4 py-3 bg-card border border-border rounded-xl text-left shadow-sm flex items-center gap-2">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase">{chip.label}</p>
                  <p className="text-sm font-semibold text-foreground">{chip.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Update your details</h3>
              <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">Editable</span>
            </div>
            <form
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!profile?.id) return;
                setIsSaving(true);
                try {
                  const { error } = await supabase
                    .from('profiles')
                    .update({
                      full_name: profileData.full_name,
                      phone: profileData.phone || null,
                      device_id: profileData.device_id || null,
                    })
                    .eq('id', profile.id);
                  if (error) throw error;
                  toast.success('Profile updated');
                } catch (err: any) {
                  toast.error(err.message || 'Failed to update profile');
                } finally {
                  setIsSaving(false);
                }
              }}
            >
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                <input
                  className="input-field"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Email</label>
                <input className="input-field bg-muted/50 cursor-not-allowed" value={profileData.email} disabled />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Phone</label>
                <input
                  className="input-field"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="e.g. +2547..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Device ID</label>
                <input
                  className="input-field"
                  value={profileData.device_id}
                  onChange={(e) => setProfileData(prev => ({ ...prev, device_id: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="btn-primary flex items-center gap-2"
                  disabled={isSaving}
                >
                  {isSaving && <Save className="w-4 h-4 animate-spin" />}
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3 text-foreground">
              <Activity className="w-5 h-5" />
              <h3 className="text-sm font-semibold text-muted-foreground">Recent activity</h3>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Last login: {new Date().toLocaleString('en-KE', { hour: '2-digit', minute: '2-digit', weekday: 'short', month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Account status: Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

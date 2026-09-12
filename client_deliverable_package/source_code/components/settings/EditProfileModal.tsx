import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, User, Phone, Smartphone, Copy } from 'lucide-react';
import { ProfileWithRole, useUpdateProfile } from '@/hooks/useSettings';
import { getClientDeviceId } from '@/lib/device';
import { toast } from 'sonner';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: ProfileWithRole | null;
}

export function EditProfileModal({ isOpen, onClose, profile }: EditProfileModalProps) {
  const updateProfile = useUpdateProfile();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const thisDeviceId = typeof window !== 'undefined' ? getClientDeviceId() : 'unknown';

  useEffect(() => {
    if (isOpen && profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setDeviceId(profile.device_id || thisDeviceId || '');
    }
  }, [isOpen, profile, thisDeviceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    await updateProfile.mutateAsync({
      id: profile.id,
      full_name: fullName,
      phone,
      device_id: deviceId,
    });
    onClose();
  };

  const copyDeviceId = async () => {
    try {
      await navigator.clipboard.writeText(thisDeviceId);
      toast.success('Device ID copied');
    } catch (e) {
      toast.error('Could not copy device ID');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Phone</label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-field pl-10"
                placeholder="+254..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Authorized Device ID</label>
            <div className="relative">
              <Smartphone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="input-field pl-10"
                placeholder="Device serial or UUID"
              />
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground">This device ID</p>
                <p className="text-muted-foreground">Use this value to authorize this browser or phone.</p>
              </div>
              <button
                type="button"
                onClick={copyDeviceId}
                className="inline-flex items-center gap-1 text-primary text-xs font-semibold"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
            <div className="font-mono text-[11px] break-all text-foreground">{thisDeviceId}</div>
            <div className="grid grid-cols-1 gap-2 text-muted-foreground">
              <div>
                <span className="font-semibold text-foreground">PC/Laptop:</span> Open Settings → Device Policies on this machine, copy the ID above, paste into Authorized Device ID, then Save.
              </div>
              <div>
                <span className="font-semibold text-foreground">Mobile:</span> Log into this screen on the phone browser, copy the ID shown here, paste into Authorized Device ID, then Save.
              </div>
              <div>
                <span className="font-semibold text-foreground">Login checks:</span> At sign-in we compare this stored ID with the device ID above. Mismatched devices are signed out and blocked.
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary min-w-[120px]" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

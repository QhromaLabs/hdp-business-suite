import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, ShieldCheck } from 'lucide-react';
import { AppRole, ProfileWithRole, useUpsertUserRole } from '@/hooks/useSettings';

interface ManageRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: ProfileWithRole[];
  selectedUserId?: string;
}

const roles: AppRole[] = ['admin', 'manager', 'clerk', 'sales_rep', 'delivery_agent'];

export function ManageRoleModal({ isOpen, onClose, profiles, selectedUserId }: ManageRoleModalProps) {
  const [userId, setUserId] = useState<string>(selectedUserId || '');
  const [role, setRole] = useState<AppRole>('clerk');
  const upsertRole = useUpsertUserRole();

  useEffect(() => {
    if (isOpen) {
      setUserId(selectedUserId || '');
      const selected = profiles.find(p => p.id === selectedUserId);
      if (selected?.role) setRole(selected.role);
    }
  }, [isOpen, selectedUserId, profiles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    await upsertRole.mutateAsync({ user_id: userId, role });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Assign Role
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">User</label>
            <select
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="input-field"
            >
              <option value="">Select user</option>
              {profiles.map(profile => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name} ({profile.email})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {roles.map(r => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRole(r)}
                  className={`border rounded-lg px-3 py-2 text-sm font-medium capitalize ${role === r ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:bg-muted'}`}
                >
                  {r.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary min-w-[120px]" disabled={upsertRole.isPending}>
              {upsertRole.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

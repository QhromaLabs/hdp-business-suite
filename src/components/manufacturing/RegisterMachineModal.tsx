import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Plus, Wrench } from 'lucide-react';
import { useRegisterMachine, useUpdateMachine, Machine } from '@/hooks/useManufacturing';

interface RegisterMachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  machineToEdit?: Machine | null;
}

export function RegisterMachineModal({ isOpen, onClose, machineToEdit }: RegisterMachineModalProps) {
  const registerMachine = useRegisterMachine();
  const updateMachine = useUpdateMachine();
  const [formData, setFormData] = useState({
    name: '',
    status: 'operational',
    purchase_date: '',
    purchase_cost: '',
    current_value: '',
    depreciation_rate: '10',
    last_maintenance: '',
    description: '',
  });

  useEffect(() => {
    if (isOpen) {
      if (machineToEdit) {
        setFormData({
          name: machineToEdit.name || '',
          status: machineToEdit.status || 'operational',
          purchase_date: machineToEdit.purchase_date || '',
          purchase_cost: machineToEdit.purchase_cost ? String(machineToEdit.purchase_cost) : '',
          current_value: machineToEdit.current_value ? String(machineToEdit.current_value) : '',
          depreciation_rate: machineToEdit.depreciation_rate ? String(machineToEdit.depreciation_rate) : '10',
          last_maintenance: machineToEdit.last_maintenance || '',
          description: machineToEdit.description || '',
        });
      } else {
        setFormData({
          name: '',
          status: 'operational',
          purchase_date: '',
          purchase_cost: '',
          current_value: '',
          depreciation_rate: '10',
          last_maintenance: '',
          description: '',
        });
      }
    }
  }, [isOpen, machineToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (machineToEdit) {
      await updateMachine.mutateAsync({
        id: machineToEdit.id,
        name: formData.name,
        status: formData.status,
        purchase_date: formData.purchase_date || null,
        purchase_cost: formData.purchase_cost ? Number(formData.purchase_cost) : null,
        current_value: formData.current_value ? Number(formData.current_value) : null,
        depreciation_rate: formData.depreciation_rate ? Number(formData.depreciation_rate) : null,
        last_maintenance: formData.last_maintenance || null,
        description: formData.description || undefined,
      });
    } else {
      await registerMachine.mutateAsync({
        name: formData.name,
        status: formData.status,
        purchase_date: formData.purchase_date || null,
        purchase_cost: formData.purchase_cost ? Number(formData.purchase_cost) : null,
        current_value: formData.current_value ? Number(formData.current_value) : null,
        depreciation_rate: formData.depreciation_rate ? Number(formData.depreciation_rate) : null,
        last_maintenance: formData.last_maintenance || null,
        description: formData.description || undefined,
      });
    }

    setFormData({
      name: '',
      status: 'operational',
      purchase_date: '',
      purchase_cost: '',
      current_value: '',
      depreciation_rate: '10',
      last_maintenance: '',
      description: '',
    });
    onClose();
  };

  const isSaving = registerMachine.isPending || updateMachine.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            {machineToEdit ? 'Edit Machine' : 'Register Machine'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <input
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="input-field"
                placeholder="e.g. Mixer 01"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="input-field"
              >
                <option value="operational">Operational</option>
                <option value="maintenance">Maintenance</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Purchase date</label>
              <input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
                className="input-field"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Purchase cost</label>
              <input
                type="number"
                min={0}
                value={formData.purchase_cost}
                onChange={(e) => setFormData(prev => ({ ...prev, purchase_cost: e.target.value }))}
                className="input-field"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Current value</label>
              <input
                type="number"
                min={0}
                value={formData.current_value}
                onChange={(e) => setFormData(prev => ({ ...prev, current_value: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Depreciation rate (%)</label>
              <input
                type="number"
                min={0}
                value={formData.depreciation_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, depreciation_rate: e.target.value }))}
                className="input-field"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Last maintenance</label>
              <input
                type="date"
                value={formData.last_maintenance}
                onChange={(e) => setFormData(prev => ({ ...prev, last_maintenance: e.target.value }))}
                className="input-field"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="input-field"
                placeholder="Notes, serial number, location..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary min-w-[140px]" disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {machineToEdit ? 'Save Changes' : 'Save Machine'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, MapPin, NotebookPen, Calendar as CalendarIcon, Users } from 'lucide-react';
import { useCreateSalesFeedback } from '@/hooks/useSalesOrders';
import { useCustomers } from '@/hooks/useCustomers';
import { Employee } from '@/hooks/useEmployees';

interface LogFieldNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  reps: Employee[];
}

export function LogFieldNoteModal({ isOpen, onClose, reps }: LogFieldNoteModalProps) {
  const createFeedback = useCreateSalesFeedback();
  const { data: customers = [] } = useCustomers();

  const [formData, setFormData] = useState({
    sales_rep_id: '',
    customer_id: '',
    feedback_type: 'visit',
    status: 'open',
    follow_up_date: '',
    content: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createFeedback.mutateAsync({
      sales_rep_id: formData.sales_rep_id,
      customer_id: formData.customer_id || null,
      feedback_type: formData.feedback_type,
      status: formData.status,
      follow_up_date: formData.follow_up_date || null,
      content: formData.content,
    });
    onClose();
    setFormData({
      sales_rep_id: '',
      customer_id: '',
      feedback_type: 'visit',
      status: 'open',
      follow_up_date: '',
      content: '',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <NotebookPen className="w-4 h-4" />
            Log Field Note
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sales Rep</label>
              <div className="relative">
                <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <select
                  required
                  value={formData.sales_rep_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, sales_rep_id: e.target.value }))}
                  className="input-field pl-10"
                >
                  <option value="">Select rep</option>
                  {reps.map(rep => (
                    <option key={rep.id} value={rep.id}>{rep.full_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer (optional)</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_id: e.target.value }))}
                  className="input-field pl-10"
                >
                  <option value="">Select customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Feedback Type</label>
              <select
                value={formData.feedback_type}
                onChange={(e) => setFormData(prev => ({ ...prev, feedback_type: e.target.value }))}
                className="input-field"
              >
                <option value="visit">Visit</option>
                <option value="order_followup">Order follow-up</option>
                <option value="issue">Issue</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="input-field"
              >
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Follow-up Date</label>
              <div className="relative">
                <CalendarIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="date"
                  value={formData.follow_up_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, follow_up_date: e.target.value }))}
                  className="input-field pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <textarea
              required
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              className="input-field min-h-[100px]"
              placeholder="Visit summary, next steps, obstacles..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary min-w-[130px]" disabled={createFeedback.isPending}>
              {createFeedback.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Note'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Save, Loader2, Building2, User, Phone, Mail, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface CreateSupplierModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateSupplierModal({ onClose, onSuccess }: CreateSupplierModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name) {
            toast.error('Supplier Name is required');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('creditors')
                .insert([{
                    name: formData.name,
                    contact_person: formData.contact_person,
                    phone: formData.phone,
                    email: formData.email,
                    address: formData.address,
                    outstanding_balance: 0
                }]);

            if (error) throw error;

            toast.success('Supplier Added Successfully');
            onSuccess();
            onClose();

        } catch (error: any) {
            console.error('Error adding supplier:', error);
            toast.error('Failed to add supplier: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-card w-full max-w-lg rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden animate-scale-in">

                <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
                    <div>
                        <h2 className="text-xl font-bold">New Supplier</h2>
                        <p className="text-sm text-muted-foreground">Add a new vendor or creditor</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Business Name *</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Acme Supplies Ltd"
                                className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Contact Person</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <input
                                type="text"
                                value={formData.contact_person}
                                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                placeholder="e.g. John Doe"
                                className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Phone</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+254..."
                                    className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="supplier@email.com"
                                    className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Address</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 text-muted-foreground w-4 h-4" />
                            <textarea
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Physical address or location..."
                                className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[80px]"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 rounded-xl font-medium hover:bg-muted transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-primary text-primary-foreground px-6 py-2 rounded-xl font-medium flex items-center gap-2 hover:opacity-90 transition-all shadow-md active:scale-95 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Supplier
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

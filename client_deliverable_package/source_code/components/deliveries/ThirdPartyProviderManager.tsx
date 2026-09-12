import React, { useState } from 'react';
import { useThirdPartyProviders, useCreateThirdPartyProvider, useUpdateThirdPartyProvider, useDeleteThirdPartyProvider, ThirdPartyProvider } from '@/hooks/useThirdPartyProviders';
import {
    Plus,
    Trash2,
    Edit2,
    Globe,
    Phone,
    Mail,
    Image as ImageIcon,
    Loader2,
    X,
    Check,
    Truck
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export function ThirdPartyProviderManager() {
    const { data: providers = [], isLoading } = useThirdPartyProviders();
    const createProvider = useCreateThirdPartyProvider();
    const updateProvider = useUpdateThirdPartyProvider();
    const deleteProvider = useDeleteThirdPartyProvider();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProvider, setEditingProvider] = useState<ThirdPartyProvider | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        image_url: '',
        phone: '',
        email: '',
        description: ''
    });

    const handleOpenModal = (provider?: ThirdPartyProvider) => {
        if (provider) {
            setEditingProvider(provider);
            setFormData({
                name: provider.name,
                image_url: provider.image_url || '',
                phone: provider.phone || '',
                email: provider.email || '',
                description: provider.description || ''
            });
        } else {
            setEditingProvider(null);
            setFormData({
                name: '',
                image_url: '',
                phone: '',
                email: '',
                description: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            toast.error('Provider name is required');
            return;
        }

        if (editingProvider) {
            updateProvider.mutate({ id: editingProvider.id, ...formData }, {
                onSuccess: () => setIsModalOpen(false)
            });
        } else {
            createProvider.mutate(formData, {
                onSuccess: () => setIsModalOpen(false)
            });
        }
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this provider?')) {
            deleteProvider.mutate(id);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black text-foreground tracking-tight">Third Party Providers</h3>
                    <p className="text-sm text-muted-foreground font-medium">Manage external delivery partners like G4S, Sendy, etc.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Add Provider
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {providers.length === 0 ? (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-2xl bg-muted/20">
                        <Truck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground font-medium">No third party providers added yet.</p>
                    </div>
                ) : (
                    providers.map((provider) => (
                        <div key={provider.id} className="bg-card border border-border/50 rounded-2xl overflow-hidden group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                            <div className="h-32 bg-muted/30 relative flex items-center justify-center p-6 border-b border-border/10">
                                {provider.image_url ? (
                                    <img src={provider.image_url} alt={provider.name} className="max-h-full max-w-full object-contain drop-shadow-md" />
                                ) : (
                                    <Truck className="w-12 h-12 text-muted-foreground/20" />
                                )}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    <button onClick={() => handleOpenModal(provider)} className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-sm hover:text-primary transition-colors">
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleDelete(provider.id)} className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-sm hover:text-destructive transition-colors">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-extrabold text-foreground text-lg">{provider.name}</h4>
                                    {!provider.is_active && (
                                        <span className="text-[10px] font-black uppercase text-muted-foreground bg-muted px-2 py-0.5 rounded">Inactive</span>
                                    )}
                                </div>

                                {provider.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 italic">"{provider.description}"</p>
                                )}

                                <div className="space-y-1.5 pt-2">
                                    {provider.phone && (
                                        <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
                                            <Phone className="w-3 h-3 text-primary/60" />
                                            {provider.phone}
                                        </div>
                                    )}
                                    {provider.email && (
                                        <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
                                            <Mail className="w-3 h-3 text-primary/60" />
                                            {provider.email}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[450px] bg-white/95 backdrop-blur-xl border-white/20">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                            {editingProvider ? <Edit2 className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                            {editingProvider ? 'Edit Provider' : 'Add New Provider'}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Form to {editingProvider ? 'edit' : 'add'} a third party delivery provider.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-muted-foreground tracking-wider">Provider Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. G4S, Sendy, Uber Connect"
                                className="w-full px-4 py-2.5 bg-muted/40 border-border/50 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm font-bold placeholder:font-medium transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-muted-foreground tracking-wider">Logo / Image URL</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={formData.image_url}
                                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                    placeholder="https://"
                                    className="flex-1 px-4 py-2.5 bg-muted/40 border-border/50 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm font-bold placeholder:font-medium transition-all"
                                />
                                <div className="w-10 h-10 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-center overflow-hidden shrink-0">
                                    {formData.image_url ? (
                                        <img src={formData.image_url} alt="Preview" className="w-full h-full object-contain" onError={(e) => (e.currentTarget.src = "")} />
                                    ) : (
                                        <ImageIcon className="w-4 h-4 text-muted-foreground/30" />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-muted-foreground tracking-wider">Phone Number</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+254..."
                                    className="w-full px-4 py-2.5 bg-muted/40 border-border/50 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm font-bold transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-muted-foreground tracking-wider">Email Address</label>
                                <input
                                    type="text"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="contact@company.com"
                                    className="w-full px-4 py-2.5 bg-muted/40 border-border/50 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm font-bold transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-muted-foreground tracking-wider">Description / Notes</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Service coverage, contract terms, etc."
                                className="w-full px-4 py-2.5 bg-muted/40 border-border/50 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm font-bold placeholder:font-medium transition-all min-h-[80px] resize-none"
                            />
                        </div>
                    </form>

                    <DialogFooter>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-6 py-2 rounded-xl border border-border font-bold text-sm hover:bg-muted transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={createProvider.isPending || updateProvider.isPending}
                            className="px-8 py-2 rounded-xl bg-primary text-primary-foreground font-black shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
                        >
                            {(createProvider.isPending || updateProvider.isPending) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Check className="w-4 h-4" />
                            )}
                            {editingProvider ? 'Update Provider' : 'Save Provider'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

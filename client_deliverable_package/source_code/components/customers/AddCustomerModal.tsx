
import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useCreateCustomer, useUpdateCustomer, CustomerType } from '@/hooks/useCustomers';
import { Loader2, Plus, User, Phone, Mail, MapPin, CreditCard, Building, Map as MapIcon } from 'lucide-react';
import { LocationPicker } from '../deliveries/LocationPicker';

interface AddCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerToEdit?: any;
}

export function AddCustomerModal({ isOpen, onClose, customerToEdit }: AddCustomerModalProps) {
    const createCustomer = useCreateCustomer();
    const updateCustomer = useUpdateCustomer();

    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        address_name: '',
        latitude: null as number | null,
        longitude: null as number | null,
        customer_type: 'normal' as CustomerType,
        credit_limit: '0',
    });

    useEffect(() => {
        if (customerToEdit) {
            setFormData({
                name: customerToEdit.name || '',
                email: customerToEdit.email || '',
                phone: customerToEdit.phone || '',
                address: customerToEdit.address || '',
                address_name: customerToEdit.address_name || '',
                latitude: customerToEdit.latitude || null,
                longitude: customerToEdit.longitude || null,
                customer_type: customerToEdit.customer_type || 'normal',
                credit_limit: String(customerToEdit.credit_limit || '0'),
            });
        } else {
            setFormData({
                name: '',
                email: '',
                phone: '',
                address: '',
                address_name: '',
                latitude: null,
                longitude: null,
                customer_type: 'normal',
                credit_limit: '0',
            });
        }
    }, [customerToEdit, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (customerToEdit) {
                await updateCustomer.mutateAsync({
                    id: customerToEdit.id,
                    ...formData,
                    credit_limit: Number(formData.credit_limit)
                });
            } else {
                await createCustomer.mutateAsync({
                    ...formData,
                    credit_limit: Number(formData.credit_limit)
                });
            }
            onClose();
        } catch (error) {
            console.error('Error saving customer:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{customerToEdit ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                required
                                type="text"
                                placeholder="e.g. John Doe"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="input-field pl-10"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="email"
                                    placeholder="john@example.com"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="input-field pl-10"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Phone</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    required
                                    type="tel"
                                    placeholder="+254..."
                                    value={formData.phone}
                                    onChange={e => {
                                        let value = e.target.value;
                                        // Auto-add prefix if missing
                                        if (!value.startsWith('+254')) {
                                            const stripped = value.replace(/^\+?254|^0+/, '');
                                            value = `+254${stripped}`;
                                        }
                                        // Remove leading '0' after prefix
                                        if (value.startsWith('+2540')) {
                                            value = `+254${value.substring(5)}`;
                                        }
                                        setFormData({ ...formData, phone: value });
                                    }}
                                    className="input-field pl-10"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-2 border-t border-border mt-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <MapIcon className="w-4 h-4 text-primary" />
                            Delivery Location
                        </div>

                        <LocationPicker
                            initialLocation={customerToEdit ? {
                                lat: customerToEdit.latitude || -1.286389,
                                lng: customerToEdit.longitude || 36.817223,
                                address: customerToEdit.address_name || customerToEdit.address || ''
                            } : undefined}
                            onLocationSelect={(loc) => {
                                setFormData(prev => ({
                                    ...prev,
                                    latitude: loc.lat,
                                    longitude: loc.lng,
                                    address_name: loc.address,
                                    // Optionally sync address field if it's empty
                                    address: prev.address || loc.address
                                }));
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Digital Address / Landmarks</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="e.g. Near Westlands Mall, 3rd Floor"
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                className="input-field pl-10"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Customer Type</label>
                            <div className="relative">
                                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <select
                                    value={formData.customer_type}
                                    onChange={e => setFormData({ ...formData, customer_type: e.target.value as CustomerType })}
                                    className="input-field pl-10"
                                >
                                    <option value="normal">Normal</option>
                                    <option value="consignment">Consignment</option>
                                    <option value="credit">Credit</option>
                                    <option value="marketplace">Marketplace</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Credit Limit</label>
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={formData.credit_limit}
                                    onChange={e => setFormData({ ...formData, credit_limit: e.target.value })}
                                    className="input-field pl-10"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary min-w-[120px]"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    {customerToEdit ? 'Update Customer' : 'Save Customer'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

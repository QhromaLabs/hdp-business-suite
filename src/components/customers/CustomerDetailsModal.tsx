
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { User, Phone, Mail, MapPin, CreditCard, Calendar, Building } from 'lucide-react';

interface CustomerDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: any;
}

export function CustomerDetailsModal({ isOpen, onClose, customer }: CustomerDetailsModalProps) {
    if (!customer) return null;

    const details = [
        { label: 'Email', value: customer.email || 'N/A', icon: Mail },
        { label: 'Phone', value: customer.phone || 'N/A', icon: Phone },
        { label: 'Address', value: customer.address || 'N/A', icon: MapPin },
        { label: 'Type', value: customer.customer_type, icon: Building, capitalize: true },
        { label: 'Credit Limit', value: `KES ${Number(customer.credit_limit).toLocaleString()}`, icon: CreditCard },
        { label: 'Credit Balance', value: `KES ${Number(customer.credit_balance).toLocaleString()}`, icon: CreditCard },
        { label: 'Joined', value: new Date(customer.created_at).toLocaleDateString(), icon: Calendar },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <User className="w-5 h-5" />
                        </div>
                        {customer.name}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 gap-4 py-4">
                    {details.map((item) => (
                        <div key={item.label} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/50">
                            <div className="p-2 bg-background rounded-lg text-muted-foreground shadow-sm">
                                <item.icon className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                                <p className={`text-sm font-semibold text-foreground ${item.capitalize ? 'capitalize' : ''}`}>
                                    {item.value}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}

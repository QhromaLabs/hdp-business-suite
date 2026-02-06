
import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { useDeliveryAgents } from '@/hooks/useDeliveryAgents';
import { useUpdateSalesOrderStatus } from '@/hooks/useSalesOrders';
import { LocationPicker } from '@/components/deliveries/LocationPicker';
import { User, MapPin, Navigation, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DispatchOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
}

export function DispatchOrderModal({ isOpen, onClose, order }: DispatchOrderModalProps) {
    const { data: agents = [], isLoading: agentsLoading } = useDeliveryAgents();
    const updateStatus = useUpdateSalesOrderStatus();

    const [selectedAgentId, setSelectedAgentId] = useState<string>('');
    const [location, setLocation] = useState({
        lat: Number(order?.latitude) || Number(order?.customer?.latitude) || -1.286389,
        lng: Number(order?.longitude) || Number(order?.customer?.longitude) || 36.817223,
        address: order?.address_name || order?.customer?.address_name || order?.customer?.address || ''
    });

    // Update state when order changes (e.g. when opening modal)
    React.useEffect(() => {
        if (order) {
            setLocation({
                lat: Number(order?.latitude) || Number(order?.customer?.latitude) || -1.286389,
                lng: Number(order?.longitude) || Number(order?.customer?.longitude) || 36.817223,
                address: order?.address_name || order?.customer?.address_name || order?.customer?.address || ''
            });
        }
    }, [order]);

    const handleDispatch = () => {
        if (!selectedAgentId) {
            toast.error('Please select a delivery agent');
            return;
        }

        updateStatus.mutate({
            id: order.id,
            status: 'dispatched',
            delivery_agent_id: selectedAgentId,
            latitude: location.lat,
            longitude: location.lng,
            address_name: location.address
        }, {
            onSuccess: () => {
                toast.success('Order dispatched successfully');
                onClose();
            },
            onError: (error: any) => {
                toast.error('Failed to dispatch order: ' + error.message);
            }
        });
    };

    if (!order) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border/50">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl font-black">
                        <Navigation className="w-6 h-6 text-primary" />
                        Dispatch Order #{order.order_number}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Agent Selection */}
                    <div className="space-y-4">
                        <label className="text-sm font-bold text-foreground flex items-center gap-2">
                            <User className="w-4 h-4 text-primary" />
                            Assign Delivery Agent
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {agentsLoading ? (
                                <div className="col-span-full py-4 text-center">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                                    <p className="text-sm text-muted-foreground mt-2">Loading agents...</p>
                                </div>
                            ) : agents.length === 0 ? (
                                <div className="col-span-full py-4 text-center border border-dashed border-border rounded-xl">
                                    <p className="text-sm text-muted-foreground">No delivery agents found. Add some in Team Management.</p>
                                </div>
                            ) : (
                                agents.map((agent) => (
                                    <button
                                        key={agent.id}
                                        type="button"
                                        onClick={() => setSelectedAgentId(agent.id)}
                                        className={`flex flex-col p-4 rounded-xl border text-left transition-all ${selectedAgentId === agent.id
                                            ? 'bg-primary/10 border-primary ring-1 ring-primary shadow-sm'
                                            : 'bg-muted/30 border-border/50 hover:border-primary/50'
                                            }`}
                                    >
                                        <span className="font-bold text-foreground">{agent.full_name}</span>
                                        <span className="text-xs text-muted-foreground">{agent.phone || agent.email}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Location Verification */}
                    <div className="space-y-4 pt-2">
                        <label className="text-sm font-bold text-foreground flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            Verify Delivery Location
                        </label>
                        <LocationPicker
                            initialLocation={{
                                lat: location.lat,
                                lng: location.lng,
                                address: location.address
                            }}
                            onLocationSelect={(loc) => setLocation(loc)}
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl border border-border font-bold hover:bg-muted transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleDispatch}
                        disabled={updateStatus.isPending || !selectedAgentId}
                        className="px-8 py-2.5 rounded-xl bg-primary text-primary-foreground font-black shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                        {updateStatus.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Dispatching...
                            </>
                        ) : (
                            <>
                                <Navigation className="w-4 h-4" />
                                Confirm Dispatch
                            </>
                        )}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

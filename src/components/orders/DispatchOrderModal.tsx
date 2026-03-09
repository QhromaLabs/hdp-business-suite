import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Users, MapPin, Navigation, Loader2, Truck, Globe, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { useThirdPartyProviders } from '@/hooks/useThirdPartyProviders';
import { useDeliveryAgents } from '@/hooks/useDeliveryAgents';
import { useUpdateSalesOrderStatus } from '@/hooks/useSalesOrders';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DispatchOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
}

export function DispatchOrderModal({ isOpen, onClose, order }: DispatchOrderModalProps) {
    const { data: agents = [], isLoading: isLoadingAgents } = useDeliveryAgents();
    const { data: providers = [], isLoading: isLoadingProviders } = useThirdPartyProviders();
    const updateStatus = useUpdateSalesOrderStatus();

    const [dispatchType, setDispatchType] = useState<'agent' | 'third_party' | 'self_pickup'>('agent');
    const [selectedAgentId, setSelectedAgentId] = useState<string>('');
    const [selectedProviderId, setSelectedProviderId] = useState<string>('');
    const [location, setLocation] = useState({
        lat: Number(order?.latitude) || Number(order?.customer?.latitude) || -1.286389,
        lng: Number(order?.longitude) || Number(order?.customer?.longitude) || 36.817223,
        address: order?.address_name || order?.customer?.address_name || order?.customer?.address || ''
    });
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);

    // Reset and update state when modal opens with a new order
    React.useEffect(() => {
        if (isOpen && order) {
            setGeneratedCode(null);
            setSelectedAgentId('');
            setSelectedProviderId('');
            setDispatchType('agent');
            setLocation({
                lat: Number(order?.latitude) || Number(order?.customer?.latitude) || -1.286389,
                lng: Number(order?.longitude) || Number(order?.customer?.longitude) || 36.817223,
                address: order?.address_name || order?.customer?.address_name || order?.customer?.address || ''
            });
        }
    }, [isOpen, order?.id]);

    const handleDispatch = () => {
        if (dispatchType !== 'self_pickup' && !location.address) {
            toast.error('Please select a valid location');
            return;
        }

        if (dispatchType === 'agent' && !selectedAgentId) {
            toast.error('Please select a delivery agent');
            return;
        }

        if (dispatchType === 'third_party' && !selectedProviderId) {
            toast.error('Please select a third party provider');
            return;
        }

        const deliveryCode = Math.floor(1000 + Math.random() * 9000).toString();

        const payload: any = {
            id: order.id,
            status: dispatchType === 'self_pickup' ? 'ready_for_pickup' : 'in_transit',
            latitude: location.lat,
            longitude: location.lng,
            address_name: location.address,
            delivery_code: deliveryCode,
            is_self_pickup: dispatchType === 'self_pickup'
        };

        if (dispatchType === 'agent') {
            payload.delivery_agent_id = selectedAgentId;
        } else if (dispatchType === 'third_party') {
            payload.third_party_provider_id = selectedProviderId;
        }

        updateStatus.mutate(payload, {
            onSuccess: () => {
                setGeneratedCode(deliveryCode);
                toast.success(dispatchType === 'self_pickup' ? 'Order ready for pickup' : 'Order dispatched successfully');
            },
            onError: (error: any) => {
                toast.error('Failed to dispatch order: ' + error.message);
            }
        });
    };

    if (generatedCode) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[400px] bg-white/95 backdrop-blur-xl border-white/20 text-center p-12">
                    <DialogHeader className="sr-only">
                        <DialogTitle>{dispatchType === 'self_pickup' ? 'Ready for Pickup!' : 'Order Dispatched!'}</DialogTitle>
                        <DialogDescription>Verification code for the dispatch</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-10 h-10 text-success" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight mb-2">
                                {dispatchType === 'self_pickup' ? 'Ready for Pickup!' : 'Order Dispatched!'}
                            </h2>
                            <p className="text-muted-foreground font-medium">
                                {dispatchType === 'self_pickup'
                                    ? 'Give this code to the customer when they arrive'
                                    : 'Share this delivery verification code with the recipient'}
                            </p>
                        </div>
                        <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-6 w-full">
                            <span className="text-5xl font-black tracking-[0.2em] text-primary">
                                {generatedCode}
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                        >
                            Close
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] gap-0 p-0 overflow-hidden bg-white/95 backdrop-blur-xl border-white/20 shadow-2xl">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Truck className="w-6 h-6 text-primary" />
                        </div>
                        Dispatch Order
                    </DialogTitle>
                    <DialogDescription className="text-base font-medium text-muted-foreground/80">
                        Assign a delivery agent and verify location.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    {/* Dispatch Type Selection */}
                    <div className="bg-muted/50 p-1.5 rounded-2xl flex items-center gap-1">
                        <button
                            onClick={() => setDispatchType('agent')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all",
                                dispatchType === 'agent' ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:bg-white/50"
                            )}
                        >
                            <Users className="w-4 h-4" />
                            Internal Agent
                        </button>
                        <button
                            onClick={() => setDispatchType('third_party')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all",
                                dispatchType === 'third_party' ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:bg-white/50"
                            )}
                        >
                            <Globe className="w-4 h-4" />
                            Third Party
                        </button>
                        <button
                            onClick={() => setDispatchType('self_pickup')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all",
                                dispatchType === 'self_pickup' ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:bg-white/50"
                            )}
                        >
                            <ShoppingBag className="w-4 h-4" />
                            Self Pickup
                        </button>
                    </div>

                    {dispatchType === 'agent' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                    <Users className="w-3.5 h-3.5" />
                                    Select Delivery Agent
                                </label>
                                <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                    {isLoadingAgents ? (
                                        <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
                                    ) : agents.length === 0 ? (
                                        <div className="p-4 border rounded-xl bg-card text-center text-sm font-medium text-muted-foreground">No agents available</div>
                                    ) : (
                                        agents.map((agent: any) => (
                                            <button
                                                key={agent.id}
                                                onClick={() => setSelectedAgentId(agent.id)}
                                                className={cn(
                                                    "flex items-center justify-between p-4 rounded-xl border transition-all",
                                                    selectedAgentId === agent.id
                                                        ? "bg-primary/5 border-primary ring-1 ring-primary/20"
                                                        : "bg-card border-border/50 hover:bg-muted/50"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary">
                                                        {agent.full_name.charAt(0)}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="font-bold text-sm">{agent.full_name}</p>
                                                        <p className="text-xs text-muted-foreground">{agent.phone}</p>
                                                    </div>
                                                </div>
                                                {selectedAgentId === agent.id && <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {dispatchType === 'third_party' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                    <Globe className="w-3.5 h-3.5" />
                                    Select Service Provider
                                </label>
                                <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                    {isLoadingProviders ? (
                                        <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
                                    ) : providers.length === 0 ? (
                                        <div className="p-4 border rounded-xl bg-card text-center text-sm font-medium text-muted-foreground">No providers added. Add them in Deliveries &gt; Settings.</div>
                                    ) : (
                                        providers.map((provider: any) => (
                                            <button
                                                key={provider.id}
                                                onClick={() => setSelectedProviderId(provider.id)}
                                                className={cn(
                                                    "flex items-center justify-between p-4 rounded-xl border transition-all",
                                                    selectedProviderId === provider.id
                                                        ? "bg-primary/5 border-primary ring-1 ring-primary/20"
                                                        : "bg-card border-border/50 hover:bg-muted/50"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {provider.image_url ? (
                                                        <img src={provider.image_url} alt={provider.name} className="w-10 h-10 rounded-lg object-contain bg-white p-1" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center font-black text-blue-600">
                                                            {provider.name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div className="text-left">
                                                        <p className="font-bold text-sm">{provider.name}</p>
                                                        <p className="text-xs text-muted-foreground">{provider.phone || 'Manual delivery'}</p>
                                                    </div>
                                                </div>
                                                {selectedProviderId === provider.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {dispatchType === 'self_pickup' && (
                        <div className="p-8 border-2 border-dashed border-primary/20 rounded-2xl bg-primary/5 text-center animate-in zoom-in-95 duration-300">
                            <ShoppingBag className="w-12 h-12 text-primary/40 mx-auto mb-4" />
                            <h4 className="font-black text-primary text-xl mb-2">Self Pickup Flow</h4>
                            <p className="text-sm text-muted-foreground font-medium px-4">
                                This will mark the order as <span className="text-primary font-bold">READY FOR PICKUP</span> and notify the customer to come collect it.
                            </p>
                        </div>
                    )}

                    {(dispatchType === 'agent' || dispatchType === 'third_party') && (
                        <div className="space-y-4 animate-in fade-in duration-500">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5" />
                                    Delivery Destination
                                </label>
                                <textarea
                                    value={location.address}
                                    onChange={(e) => setLocation({ ...location, address: e.target.value })}
                                    className="w-full px-4 py-3 bg-muted/40 border-border/50 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm font-bold placeholder:font-medium transition-all min-h-[80px]"
                                    placeholder="Enter delivery address..."
                                />
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 bg-muted/30 border-t border-border/50">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl border border-border font-bold text-sm hover:bg-muted transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDispatch}
                        disabled={updateStatus.isPending}
                        className="flex-1 sm:flex-none px-8 py-2.5 bg-primary text-primary-foreground rounded-xl font-black shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                        {updateStatus.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Navigation className="w-4 h-4" />
                        )}
                        {dispatchType === 'self_pickup' ? 'Ready for Pickup' : 'Dispatch Order'}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

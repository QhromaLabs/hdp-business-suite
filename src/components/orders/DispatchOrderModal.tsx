
import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { useDeliveryAgents } from '@/hooks/useDeliveryAgents';
import { useUpdateSalesOrderStatus } from '@/hooks/useSalesOrders';
import { LocationPicker } from '@/components/deliveries/LocationPicker';
import { Users, MapPin, Navigation, Loader2, Truck } from 'lucide-react';
import { toast } from 'sonner';

interface DispatchOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
}

export function DispatchOrderModal({ isOpen, onClose, order }: DispatchOrderModalProps) {
    const { data: agents = [], isLoading: isLoadingAgents } = useDeliveryAgents();
    const updateStatus = useUpdateSalesOrderStatus();

    const [selectedAgentId, setSelectedAgentId] = useState<string>('');
    const [location, setLocation] = useState({
        lat: Number(order?.latitude) || Number(order?.customer?.latitude) || -1.286389,
        lng: Number(order?.longitude) || Number(order?.customer?.longitude) || 36.817223,
        address: order?.address_name || order?.customer?.address_name || order?.customer?.address || ''
    });
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);

    // Update state when order changes
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
        if (!location.address) {
            toast.error('Please select a valid location');
            return;
        }

        if (!selectedAgentId) {
            toast.error('Please select a delivery agent');
            return;
        }

        // Generate 4-digit code
        const code = Math.floor(1000 + Math.random() * 9000).toString();

        updateStatus.mutate({
            id: order.id,
            status: 'dispatched',
            delivery_agent_id: selectedAgentId,
            latitude: location.lat,
            longitude: location.lng,
            address_name: location.address,
            delivery_code: code
        }, {
            onSuccess: () => {
                setGeneratedCode(code);
            },
            onError: (error: any) => {
                toast.error('Failed to dispatch order: ' + error.message);
            }
        });
    };

    if (!order) return null;

    if (generatedCode) {
        return (
            <DispatchSuccessDialog
                code={generatedCode}
                isOpen={!!generatedCode}
                onClose={onClose}
            />
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
                    {/* Agent Selection */}
                    <div className="space-y-4">
                        <label className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            Select Delivery Agent
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                            {isLoadingAgents ? (
                                <div className="col-span-full flex items-center justify-center py-8 text-muted-foreground">
                                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                    Loading agents...
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

                    {/* Delivery Code Display (if already dispatched) */}
                    {order.delivery_code && (
                        <div className="p-4 rounded-xl bg-green-50/50 border border-green-200/50">
                            <label className="text-xs font-black text-green-700 uppercase mb-2 block">Delivery Verification Code</label>
                            <p className="text-3xl font-black text-green-600 tracking-[0.3em] text-center">{order.delivery_code}</p>
                            <p className="text-xs text-muted-foreground text-center mt-2">Share this code with the customer for delivery verification</p>
                        </div>
                    )}

                    {/* Order Notes Display */}
                    {order.notes && (
                        <div className="p-3 rounded-xl bg-orange-50/50 border border-orange-100/50">
                            <label className="text-xs font-black text-orange-600/80 uppercase mb-1 block">Customer / Order Notes</label>
                            <p className="text-sm font-medium text-foreground italic">"{order.notes}"</p>
                        </div>
                    )}
                </div>

                <DialogFooter className="mr-6 mb-6 gap-2 sm:gap-0">
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

// Helper to show the code after dispatch
function DispatchSuccessDialog({
    code,
    isOpen,
    onClose
}: {
    code: string;
    isOpen: boolean;
    onClose: () => void;
}) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        toast.success("Code copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-sm bg-card border-border/50">
                <DialogHeader>
                    <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <Navigation className="w-6 h-6 text-green-600" />
                    </div>
                    <DialogTitle className="text-center text-xl font-black">Order Dispatched!</DialogTitle>
                </DialogHeader>

                <div className="text-center py-4 space-y-4">
                    <p className="text-muted-foreground text-sm">
                        Share this verification code with the customer.
                        The delivery agent will need it to complete the order.
                    </p>

                    <button
                        onClick={handleCopy}
                        className="w-full text-center py-6 bg-muted/30 rounded-2xl border-2 border-dashed border-primary/20 hover:border-primary/50 transition-all group relative"
                    >
                        <span className="text-4xl font-black tracking-[0.5em] text-primary group-hover:scale-110 transition-transform block pl-4">
                            {code}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground mt-2 block">
                            {copied ? "Copied!" : "Click to Copy"}
                        </span>
                    </button>
                </div>

                <DialogFooter>
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20"
                    >
                        Done
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

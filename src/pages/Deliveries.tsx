import { useState, useMemo, useEffect } from 'react';
import { useDeliveries, useAgentLocations, useAgentBreadcrumbs } from '@/hooks/useDeliveries';
import {
    Truck,
    MapPin,
    User,
    Phone,
    Package,
    Navigation,
    CheckCircle,
    Clock,
    Search,
    ChevronRight,
    Maximize2,
    Map as MapIcon,
    List,
    History,
    Activity,
    AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { MapContainer, TileLayer, Marker, Popup, useMap, Tooltip, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { OrderDetailsModal } from '@/components/orders/OrderDetailsModal';
import { AddCustomerModal } from '@/components/customers/AddCustomerModal';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';


// Fix Leaflet icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

const AgentIcon = L.divIcon({
    html: `<div class="w-10 h-10 rounded-full bg-[#f97316] border-4 border-white shadow-xl flex items-center justify-center text-white ring-2 ring-[#f97316]/20 animate-pulse"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-truck"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-5h-4l-3-6H14"/><circle cx="7" cy="18" r="2"/><path d="M14 11h8"/><circle cx="17" cy="18" r="2"/></svg></div>`,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
});

const DestinationIcon = L.divIcon({
    html: `<div class="w-10 h-10 rounded-full bg-[#8b5cf6] border-4 border-white shadow-lg flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-store"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2h-1.5a2 2 0 0 1-2-2V7"/><path d="M16.5 7v3a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2V7"/><path d="M11 7v3a2 2 0 0 1-2 2H7.5a2 2 0 0 1-2-2V7"/><path d="M5.5 7v3a2 2 0 0 1-2 2H2V7"/></svg></div>`,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
});

import { Target } from 'lucide-react';

// Enhanced Map Controller that handles centering and bounds
function MapController({
    center,
    zoom,
    selectedDeliveryId,
    deliveries
}: {
    center: [number, number],
    zoom: number,
    selectedDeliveryId: string | null,
    deliveries: any[]
}) {
    const map = useMap();
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

    // Auto-center ONLY when selection changes
    useEffect(() => {
        if (selectedDeliveryId && selectedDeliveryId !== lastSelectedId) {
            map.flyTo(center, zoom, { duration: 1.5 });
            setLastSelectedId(selectedDeliveryId);
        }
    }, [selectedDeliveryId, center, zoom, map, lastSelectedId]);

    // Cleanup last selection if deselected
    useEffect(() => {
        if (!selectedDeliveryId) {
            setLastSelectedId(null);
        }
    }, [selectedDeliveryId]);

    const handleRecenter = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent map click propagation
        e.preventDefault();

        if (selectedDeliveryId) {
            // Recenter on selected
            map.flyTo(center, zoom, { duration: 1 });
        } else if (deliveries.length > 0) {
            // Fit bounds to all deliveries
            const bounds = L.latLngBounds(deliveries.map(d => {
                const lat = d.latitude || d.customer?.latitude;
                const lng = d.longitude || d.customer?.longitude;
                if (!lat || !lng) return null;
                return [Number(lat), Number(lng)];
            }).filter(Boolean) as L.LatLngExpression[]);

            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    };

    return (
        <div className="leaflet-top leaflet-right" style={{ top: '10px', right: '10px', pointerEvents: 'auto' }}>
            <div className="leaflet-control">
                <button
                    onClick={handleRecenter}
                    className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg border border-border/10 hover:bg-gray-50 transition-all active:scale-95 group"
                    title={selectedDeliveryId ? "Recenter on Order" : "Fit All Orders"}
                >
                    <span className="text-sm font-bold text-gray-700 group-hover:text-black">Re-center</span>
                    <Target className={cn("w-4 h-4", selectedDeliveryId ? "text-primary fill-primary/20" : "text-gray-600")} />
                </button>
            </div>
        </div>
    );
}

export default function Deliveries() {
    const { data: deliveries = [], isLoading: deliveriesLoading } = useDeliveries();
    const { data: locations = [], isLoading: locationsLoading } = useAgentLocations();
    const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
    const [editingCustomer, setEditingCustomer] = useState<any>(null);
    const [isEditCustomerModalOpen, setIsEditCustomerModalOpen] = useState(false);

    const handleEditCustomer = async (customerId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent opening order details
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('id', customerId)
                .single();

            if (error) throw error;
            if (data) {
                setEditingCustomer(data);
                setIsEditCustomerModalOpen(true);
            }
        } catch (error) {
            console.error('Error fetching customer for edit:', error);
            toast.error('Failed to load customer details');
        }
    };

    // Handle deep linking for orderId
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('orderId');
        if (orderId && deliveries.length > 0) {
            setSelectedDeliveryId(orderId);
        }
    }, [deliveries]);

    const selectedAgentUserId = useMemo(() => {
        const delivery = deliveries.find(d => d.id === selectedDeliveryId);
        return delivery?.delivery_agent?.id || null;
    }, [deliveries, selectedDeliveryId]);

    const { data: breadcrumbs = [] } = useAgentBreadcrumbs(selectedAgentUserId);

    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'map' | 'list' | 'both'>('both');
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [activeRoutes, setActiveRoutes] = useState<Record<string, [number, number][]>>({});
    const [isLoadingRoute, setIsLoadingRoute] = useState(false);

    // Auto-select first in-transit delivery if none selected
    useEffect(() => {
        if (!selectedDeliveryId && deliveries.length > 0) {
            const firstInTransit = deliveries.find(d => d.status === 'in_transit');
            if (firstInTransit) {
                setSelectedDeliveryId(firstInTransit.id);
            }
        }
    }, [deliveries, selectedDeliveryId]);

    // Fetch road routes for ALL in-transit deliveries
    useEffect(() => {
        const fetchRoutes = async () => {
            const inTransitDeliveries = deliveries.filter(d => d.status === 'in_transit');

            if (inTransitDeliveries.length === 0) {
                setActiveRoutes({});
                return;
            }

            const newRoutes: Record<string, [number, number][]> = {};

            for (const delivery of inTransitDeliveries) {
                // Match by either employee ID or Auth user ID
                const agent = locations.find(l =>
                    l.user_id === delivery.delivery_agent?.id ||
                    (delivery.delivery_agent?.user_id && l.user_id === delivery.delivery_agent.user_id)
                );
                const destLat = delivery.latitude || delivery.customer?.latitude;
                const destLng = delivery.longitude || delivery.customer?.longitude;

                if (agent && destLat && destLng) {
                    try {
                        const response = await fetch(
                            `https://router.project-osrm.org/route/v1/driving/${agent.longitude},${agent.latitude};${destLng},${destLat}?overview=full&geometries=geojson`
                        );
                        const data = await response.json();
                        if (data.routes && data.routes[0]) {
                            const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
                            newRoutes[delivery.id] = coords;
                        }
                    } catch (e) {
                        console.error(`Failed to fetch route for ${delivery.id}:`, e);
                    }
                }
            }

            setActiveRoutes(newRoutes);
        };

        fetchRoutes();
    }, [locations, deliveries]);


    const filteredDeliveries = useMemo(() => {
        return deliveries.filter(d =>
            d.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.delivery_agent?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [deliveries, searchTerm]);

    const selectedDelivery = useMemo(() =>
        deliveries.find(d => d.id === selectedDeliveryId),
        [deliveries, selectedDeliveryId]
    );

    const mapCenter: [number, number] = useMemo(() => {
        if (selectedDelivery) {
            const lat = selectedDelivery.latitude || selectedDelivery.customer?.latitude;
            const lng = selectedDelivery.longitude || selectedDelivery.customer?.longitude;
            if (lat && lng) {
                return [Number(lat), Number(lng)];
            }
        }
        return [-1.286389, 36.817223]; // Nairobi
    }, [selectedDelivery]);

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight">Delivery Hub</h1>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">Real-time status tracking and logistics management</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search deliveries..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-card border border-border/50 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none w-64 shadow-sm"
                        />
                    </div>
                    <div className="bg-muted p-1 rounded-xl flex items-center">
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-card shadow-sm text-primary" : "text-muted-foreground")}
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('map')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'map' ? "bg-card shadow-sm text-primary" : "text-muted-foreground")}
                        >
                            <MapIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('both')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'both' ? "bg-card shadow-sm text-primary" : "text-muted-foreground")}
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
                {/* List Section */}
                {(viewMode === 'list' || viewMode === 'both') && (
                    <div className={cn(
                        "space-y-4 overflow-y-auto scrollbar-hide min-h-0",
                        viewMode === 'list' ? "lg:col-span-12" : "lg:col-span-4"
                    )}>
                        {deliveriesLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-32 bg-card animate-pulse rounded-2xl border border-border/50" />
                            ))
                        ) : filteredDeliveries.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-card rounded-2xl border border-border/50 border-dashed">
                                <Truck className="w-12 h-12 opacity-20 mb-4" />
                                <p className="font-bold">No active deliveries</p>
                            </div>
                        ) : (
                            filteredDeliveries.map((delivery) => (
                                <div
                                    key={delivery.id}
                                    onClick={() => setSelectedDeliveryId(delivery.id)}
                                    className={cn(
                                        "w-full text-left p-4 rounded-2xl border transition-all duration-300 group relative overflow-hidden cursor-pointer",
                                        selectedDeliveryId === delivery.id
                                            ? "bg-primary/5 border-primary shadow-md ring-1 ring-primary/20"
                                            : "bg-card border-border/50 hover:border-primary/50 hover:bg-muted/30"
                                    )}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                                delivery.status === 'dispatched' ? "bg-info/10 text-info" :
                                                    delivery.status === 'in_transit' ? "bg-green-500/10 text-green-600 shadow-[0_0_15px_rgba(22,163,74,0.2)]" :
                                                        "bg-success/10 text-success"
                                            )}>
                                                {delivery.status === 'in_transit' ? <Truck className="w-5 h-5 animate-pulse" /> : <Package className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="font-black text-sm tracking-tight text-foreground">Order #{delivery.order_number}</p>
                                                <p className={cn(
                                                    "text-[10px] font-bold uppercase tracking-widest",
                                                    delivery.status === 'in_transit' ? "text-green-600" : "text-muted-foreground"
                                                )}>
                                                    {delivery.status.replace('_', ' ')}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded-md">
                                            {format(new Date(delivery.dispatched_at || delivery.created_at), 'hh:mm a')}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                            <User className="w-3.5 h-3.5 text-primary/60" />
                                            <span className="text-foreground font-bold">{delivery.customer?.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                            <MapPin className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                                            {(delivery.address_name || delivery.customer?.address_name) ? (
                                                <span className="truncate">{delivery.address_name || delivery.customer?.address_name}</span>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className="truncate">N/A</span>
                                                    {delivery.customer_id && (
                                                        <button
                                                            onClick={(e) => handleEditCustomer(delivery.customer_id!, e)}
                                                            className="flex items-center justify-center p-0.5 px-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded transition-colors shadow-sm border border-yellow-200"
                                                            title="Update Customer Location"
                                                        >
                                                            <AlertTriangle className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium border-t border-border/30 pt-2 mt-2">
                                            <Navigation className="w-3.5 h-3.5 text-info/60" />
                                            <span className="font-bold text-info">Agent: {delivery.delivery_agent?.full_name || 'Unassigned'}</span>
                                        </div>
                                        {delivery.notes && (
                                            <div className="flex items-center gap-2 text-xs text-orange-600 font-medium border-t border-border/30 pt-2 mt-2 bg-orange-50/50 p-2 rounded-lg">
                                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                                <span className="truncate italic">"{delivery.notes}"</span>
                                            </div>
                                        )}
                                    </div>

                                    {selectedDeliveryId === delivery.id && (
                                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary" />
                                    )}

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedDeliveryId(delivery.id);
                                            setIsDetailsOpen(true);
                                        }}
                                        className="absolute right-4 bottom-4 p-2 bg-primary/10 text-primary rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-white"
                                        title="View Details"
                                    >
                                        <Maximize2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                            ))
                        )}
                    </div>
                )}

                {/* Map Section */}
                {(viewMode === 'map' || viewMode === 'both') && (
                    <div className={cn(
                        "bg-card rounded-3xl border border-border/50 shadow-sm overflow-hidden min-h-[400px]",
                        viewMode === 'map' ? "lg:col-span-12" : "lg:col-span-8"
                    )}>
                        <MapContainer
                            center={mapCenter}
                            zoom={13}
                            className="h-full w-full z-10"
                            scrollWheelZoom={true}
                        >
                            <MapController
                                center={mapCenter}
                                zoom={selectedDeliveryId ? 16 : 13}
                                selectedDeliveryId={selectedDeliveryId}
                                deliveries={filteredDeliveries}
                            />
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            {/* Delivery Destinations */}
                            {useMemo(() => {
                                // Create a shallow copy and reverse to get Oldest -> Newest (Painter's Algorithm for Z-Index)
                                const sorted = [...filteredDeliveries].reverse();

                                // If there is a selected delivery, move it to the end to ensure it's on top of everything
                                if (selectedDeliveryId) {
                                    const index = sorted.findIndex(d => d.id === selectedDeliveryId);
                                    if (index > -1) {
                                        const [selected] = sorted.splice(index, 1);
                                        sorted.push(selected);
                                    }
                                }
                                return sorted;
                            }, [filteredDeliveries, selectedDeliveryId]).map((delivery, index) => {
                                const lat = Number(delivery.latitude || delivery.customer?.latitude);
                                const lng = Number(delivery.longitude || delivery.customer?.longitude);
                                if (!lat || !lng) return null;

                                // Check for active agent location if in_transit
                                let agentLocation: [number, number] | null = null;
                                if (delivery.status === 'in_transit') {
                                    const loc = locations.find(l =>
                                        l.user_id === delivery.delivery_agent?.id ||
                                        (delivery.delivery_agent?.user_id && l.user_id === delivery.delivery_agent.user_id)
                                    );
                                    if (loc) {
                                        agentLocation = [Number(loc.latitude), Number(loc.longitude)];
                                    }
                                }

                                return (
                                    <div key={`delivery-group-${delivery.id}`}>
                                        <Marker
                                            position={[lat, lng]}
                                            icon={DestinationIcon}
                                            zIndexOffset={index * 100} // Ensure correct stacking order
                                            eventHandlers={{
                                                click: () => {
                                                    setSelectedDeliveryId(delivery.id);
                                                    setIsDetailsOpen(true);
                                                }
                                            }}
                                        >
                                            <Tooltip
                                                permanent
                                                direction="top"
                                                offset={[0, -20]}
                                                className="bg-transparent border-0 shadow-none p-0 !opacity-100"
                                            >
                                                <div
                                                    className="bg-white px-3 py-2 rounded-xl shadow-lg border border-border/50 cursor-pointer hover:scale-105 transition-transform"
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Prevent map click
                                                        setSelectedDeliveryId(delivery.id);
                                                        setIsDetailsOpen(true);
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={cn(
                                                            "w-2 h-2 rounded-full",
                                                            delivery.status === 'in_transit' ? "bg-green-500 animate-pulse" : "bg-primary"
                                                        )} />
                                                        <p className="font-black text-xs text-foreground">#{delivery.order_number}</p>
                                                    </div>
                                                    <p className="text-[10px] font-bold text-muted-foreground truncate max-w-[100px]">
                                                        {delivery.customer?.name}
                                                    </p>
                                                </div>
                                            </Tooltip>
                                        </Marker>

                                        {/* Road Route Line for In-Transit Orders */}
                                        {activeRoutes[delivery.id] && (
                                            <Polyline
                                                positions={activeRoutes[delivery.id]}
                                                pathOptions={{
                                                    color: '#f97316', // Orange
                                                    weight: 7,
                                                    opacity: 1,
                                                    lineCap: 'round',
                                                    lineJoin: 'round'
                                                }}
                                            />
                                        )}

                                        {/* Breadcrumb Trail (Path taken) */}
                                        {selectedDeliveryId === delivery.id && breadcrumbs.length > 1 && (
                                            <Polyline
                                                positions={breadcrumbs}
                                                pathOptions={{
                                                    color: '#94a3b8',
                                                    weight: 3,
                                                    opacity: 0.6,
                                                    dashArray: '5, 10',
                                                    lineCap: 'round'
                                                }}
                                            />
                                        )}

                                        {/* Simple Dash Line fallback if road route not loaded */}
                                        {agentLocation && !activeRoutes[delivery.id] && (
                                            <Polyline
                                                positions={[agentLocation, [lat, lng]]}
                                                pathOptions={{
                                                    color: '#3b82f6',
                                                    weight: 3,
                                                    opacity: 0.5,
                                                    dashArray: '10, 10',
                                                    lineCap: 'round'
                                                }}
                                            />
                                        )}
                                    </div>
                                );
                            })}

                            {/* Agent Locations */}
                            {locations.map((loc) => (
                                <Marker
                                    key={`agent-${loc.user_id}`}
                                    position={[Number(loc.latitude), Number(loc.longitude)]}
                                    icon={AgentIcon}
                                >
                                    <Popup>
                                        <div className="p-1">
                                            <p className="font-black text-xs mb-1">{loc.profile?.full_name}</p>
                                            <p className="text-[10px] text-muted-foreground">
                                                Last updated: {format(new Date(loc.timestamp), 'hh:mm:ss a')}
                                            </p>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>
                )}
            </div>

            {
                isDetailsOpen && selectedDelivery && (
                    <OrderDetailsModal
                        order={selectedDelivery as any}
                        onClose={() => setIsDetailsOpen(false)}
                    />
                )
            }

            <AddCustomerModal
                isOpen={isEditCustomerModalOpen}
                onClose={() => {
                    setIsEditCustomerModalOpen(false);
                    setEditingCustomer(null);
                }}
                customerToEdit={editingCustomer}
            />
        </div >
    );
}


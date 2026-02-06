import { useMemo, useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Users,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Phone,
  Navigation,
  Plus,
  Notebook,
  Calendar,
  LocateFixed,
} from 'lucide-react';
import { useUserLocations, useRequestLocation, useRecentLocationHistory } from '@/hooks/useUserLocations';
import L from 'leaflet';
import { cn } from '@/lib/utils';
import { useEmployees, useAttendanceToday } from '@/hooks/useEmployees';
import { useSalesOrders, useTodaysSales, useUpdateSalesOrderStatus, useSalesFeedback } from '@/hooks/useSalesOrders';
import { LogFieldNoteModal } from '@/components/field-sales/LogFieldNoteModal';
import { CardGridSkeleton, PageHeaderSkeleton, StatsSkeleton } from '@/components/loading/PageSkeletons';

// Fix Leaflet default icon paths
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function FieldSales() {
  const { data: employees = [], isLoading: repsLoading } = useEmployees();
  const { data: attendanceToday = [], isLoading: attendanceLoading } = useAttendanceToday();
  const { data: pendingOrdersData, isLoading: pendingLoading } = useSalesOrders('pending');
  const pendingOrders = pendingOrdersData?.orders || [];

  const { data: todaysSales = [], isLoading: todayLoading } = useTodaysSales();
  const { data: salesFeedback = [], isLoading: feedbackLoading } = useSalesFeedback();
  const updateStatus = useUpdateSalesOrderStatus();

  const { data: userLocations = [] } = useUserLocations();
  const { data: historyLocations = [] } = useRecentLocationHistory(); // Fetch history
  const { mutate: requestLocation, isPending: isRequestingLocation } = useRequestLocation();

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [statusTab, setStatusTab] = useState<'reps' | 'history'>('reps'); // Tab state

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const historyLayerRef = useRef<L.LayerGroup | null>(null);

  const fieldReps = useMemo(
    () => employees.filter(e => (e.department || '').toLowerCase().includes('sales')),
    [employees]
  );

  const attendanceByEmployee = useMemo(() => {
    const map: Record<string, string> = {};
    attendanceToday.forEach(a => {
      map[a.employee_id] = a.status;
    });
    return map;
  }, [attendanceToday]);

  const ordersByRep = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    todaysSales.forEach(order => {
      const repId = employees.find(e => e.user_id === order.created_by)?.id;
      if (!repId) return;
      if (!map[repId]) map[repId] = { count: 0, value: 0 };
      map[repId].count += 1;
      map[repId].value += Number(order.total_amount || 0);
    });
    return map;
  }, [todaysSales, employees]);

  const stats = [
    {
      title: 'Active Reps',
      value: attendanceToday.filter(a => ['present', 'field'].includes(a.status)).length,
      icon: Users,
      color: 'success',
    },
    {
      title: "Today's Orders",
      value: todaysSales.length,
      icon: Package,
      color: 'primary',
    },
    {
      title: 'Pending Approval',
      value: pendingOrders.length,
      icon: Clock,
      color: 'warning',
    },
    {
      title: "Today's Sales",
      value: formatCurrency(todaysSales.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)),
      icon: TrendingUp,
      color: 'success',
    },
  ];

  const isLoading = repsLoading || attendanceLoading || pendingLoading || todayLoading || feedbackLoading;

  const handleApprove = (id: string) => updateStatus.mutate({ id, status: 'approved' });
  const handleDispatch = (id: string) => updateStatus.mutate({ id, status: 'dispatched' });

  // Initialize Map
  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current).setView([-1.2921, 36.8219], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstanceRef.current);

      // Initialize history layer
      historyLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current = {};
        historyLayerRef.current = null;
      }
    };
  }, []);

  // Cache for location names to avoid re-fetching
  const [locationNames, setLocationNames] = useState<Record<string, string>>({});

  // Helper to fetch address
  const fetchLocationName = async (lat: number, lng: number, key: string) => {
    if (locationNames[key]) return; // Already cached

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      setLocationNames(prev => ({ ...prev, [key]: data.display_name?.split(',')[0] || 'Unknown Location' })); // Just the first part for brevity
    } catch (e) {
      console.error("Geocoding error", e);
    }
  };

  // Update History Markers (Small Dots)
  useEffect(() => {
    if (!mapInstanceRef.current || !historyLayerRef.current) return;

    const layer = historyLayerRef.current;
    layer.clearLayers(); // Clear old history to avoid duplicates

    historyLocations.forEach(loc => {
      // Don't draw history if it's the exact same as a current live marker to avoid clutter? 
      // Eh, drawing it is fine, it's a history log.

      const rep = employees.find(e => e.user_id === loc.user_id);
      const repName = rep?.full_name || 'Unknown Agent';

      L.circleMarker([loc.latitude, loc.longitude], {
        radius: 4,
        fillColor: '#94a3b8', // Grayish
        color: '#fff',
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.6
      }).bindPopup(`
               <div class="p-1">
                 <p class="text-xs font-bold">${repName}</p>
                 <p class="text-[10px] text-muted-foreground">${new Date(loc.timestamp).toLocaleTimeString()}</p>
               </div>
           `).addTo(layer);
    });

  }, [historyLocations, employees]);

  // Update Live Markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    const currentMarkers = markersRef.current;

    // Active user IDs in the current update
    const activeIds = new Set<string>();

    userLocations.forEach(loc => {
      const rep = employees.find(e => e.user_id === loc.user_id);
      const repName = rep?.full_name || 'Unknown Agent';
      const markerKey = loc.user_id;

      // Fetch address if not known
      const locationKey = `${loc.latitude},${loc.longitude}`;
      if (!locationNames[locationKey]) {
        fetchLocationName(loc.latitude, loc.longitude, locationKey);
      }

      const address = locationNames[locationKey] || `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`;

      activeIds.add(markerKey);

      // Create custom beautiful marker
      const createCustomIcon = (initials: string) => L.divIcon({
        className: 'bg-transparent border-0', // Remove default leaflet div styling
        html: `
          <div class="flex flex-col items-center justify-center w-full h-full drop-shadow-md filter">
            <div class="w-10 h-10 rounded-full bg-[#FF6600] border-[3px] border-white flex items-center justify-center text-white font-bold text-sm relative z-10 box-border">
              ${initials}
            </div>
            <div class="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-[#FF6600] -mt-1 relative z-0"></div>
          </div>
        `,
        iconSize: [40, 50],
        iconAnchor: [20, 50], // Tip of the arrow (40px circle + ~10px arrow - overlap)
        popupAnchor: [0, -45]
      });

      const initials = repName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

      const popupContent = `
        <div class="p-3 min-w-[200px] font-sans">
          <p class="font-bold text-base mb-1">${repName}</p>
          <div class="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
             <span class="inline-block w-2 h-2 rounded-full bg-green-500"></span>
             ${new Date(loc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
           <p class="text-sm border-t pt-2 mt-1">
             📍 ${address}
           </p>
        </div>
      `;

      if (currentMarkers[markerKey]) {
        // Update existing marker position
        const marker = currentMarkers[markerKey];
        marker.setLatLng([loc.latitude, loc.longitude]);
        marker.setIcon(createCustomIcon(initials)); // Update icon in case initials changed
        marker.setPopupContent(popupContent);
      } else {
        // Create new marker
        const marker = L.marker([loc.latitude, loc.longitude], {
          icon: createCustomIcon(initials)
        })
          .bindPopup(popupContent)
          .addTo(map);

        currentMarkers[markerKey] = marker;
      }
    });

    // Remove markers for users no longer in the list
    Object.keys(currentMarkers).forEach(key => {
      if (!activeIds.has(key)) {
        currentMarkers[key].remove();
        delete currentMarkers[key];
      }
    });

  }, [userLocations, employees, locationNames]);

  // Auto-fit bounds
  useEffect(() => {
    if (!mapInstanceRef.current || userLocations.length === 0) return;

    // Create bounds from all user locations
    const bounds = L.latLngBounds(userLocations.map(l => [l.latitude, l.longitude]));
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [userLocations]);

  // Rest of the map effects...

  // Note: We move the Log Item to a sub-component to handle its own async fetch cleanly
  const LocationLogItem = ({ loc, repName }: { loc: any, repName: string }) => {
    const [address, setAddress] = useState<string>('Loading address...');

    useEffect(() => {
      const fetchAddr = async () => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.latitude}&lon=${loc.longitude}`);
          const data = await res.json();
          setAddress(data.display_name?.split(',').slice(0, 3).join(',') || 'Unknown location');
        } catch {
          setAddress(`${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`);
        }
      };

      // Small delay to avoid hammering the API if list is huge (staggering could be better but this is MVP)
      const timer = setTimeout(fetchAddr, Math.random() * 1000);
      return () => clearTimeout(timer);
    }, [loc.latitude, loc.longitude]);

    const time = new Date(loc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = new Date(loc.timestamp).toLocaleDateString();

    return (
      <div className="flex gap-3 items-start p-3 bg-card/50 rounded-xl border border-border/30 text-sm hover:bg-card transition-colors">
        <div className="mt-1 w-2 h-2 rounded-full bg-primary/50 shrink-0" />
        <div>
          <p className="font-semibold">{repName}</p>
          <p className="text-xs text-muted-foreground">{date} at {time}</p>
          <p className="text-[11px] text-muted-foreground font-medium mt-1 text-primary">
            📍 {address}
          </p>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeaderSkeleton actions={1} />
        <StatsSkeleton />
        <CardGridSkeleton cards={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Field Sales</h1>
          <p className="text-sm text-muted-foreground">Live rep tracking, orders, and approvals</p>
        </div>
        <button
          onClick={() => setIsNoteModalOpen(true)}
          className="btn-primary h-11 rounded-2xl"
        >
          <Plus className="w-4 h-4" />
          Log Field Note
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="group bg-card rounded-2xl border border-border/50 p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={cn(
                  'p-3 rounded-2xl transition-transform group-hover:scale-110 duration-500',
                  stat.color === 'primary' && 'bg-primary/10 text-primary',
                  stat.color === 'success' && 'bg-success/10 text-success',
                  stat.color === 'warning' && 'bg-warning/10 text-warning',
                )}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-card bg-muted flex items-center justify-center text-xs font-bold shadow-sm">
                  {String(stat.value || '0').charAt(0)}
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground tracking-tight">{stat.value}</p>
                <p className="text-sm font-medium text-muted-foreground mt-1">{stat.title}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner overflow-hidden relative min-h-[400px]">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
            <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          </div>

          <div className="relative z-10 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-foreground">Route Optimization</h3>
                <p className="text-sm text-muted-foreground">Live field activity & coverage</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (mapInstanceRef.current && userLocations.length > 0) {
                      const bounds = L.latLngBounds(userLocations.map(l => [l.latitude, l.longitude]));
                      if (bounds.isValid()) {
                        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
                      }
                    }
                  }}
                  className="h-9 px-4 rounded-lg bg-background border border-border text-xs font-medium hover:bg-muted transition-colors"
                >
                  Recenter Map
                </button>
                <button className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors premium-glow">Satellite</button>
              </div>
            </div>
            <div className="flex-1 rounded-2xl overflow-hidden relative border border-border/50 z-0 h-[400px]">
              <div ref={mapContainerRef} className="h-full w-full" />
            </div>

            <div className="mt-8 flex gap-4">
              <div className="p-4 rounded-2xl bg-background/50 border border-border/50 flex flex-col items-center flex-1">
                <span className="text-[8px] font-black uppercase text-muted-foreground mb-1">Total Coverage</span>
                <span className="text-xl font-black text-foreground">{Math.min(100, fieldReps.length * 12)}%</span>
              </div>
              <div className="p-4 rounded-2xl bg-background/50 border border-border/50 flex flex-col items-center flex-1">
                <span className="text-[8px] font-black uppercase text-muted-foreground mb-1">Efficiency Rate</span>
                <span className="text-xl font-black text-success">
                  {todaysSales.length > 0 ? Math.min(100, Math.round((todaysSales.length / Math.max(fieldReps.length, 1)) * 25)) + '%' : '—'}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-background/50 border border-border/50 flex flex-col items-center flex-1">
                <span className="text-[8px] font-black uppercase text-muted-foreground mb-1">Route Sync</span>
                <span className="text-xl font-black text-primary uppercase text-sm">{fieldReps.length ? 'Synced' : 'Offline'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner">
          <h3 className="text-xl font-bold text-foreground mb-6">Elite Performers</h3>
          <div className="space-y-4">
            {fieldReps.map((rep, idx) => {
              const repOrders = ordersByRep[rep.id];
              const salesValue = repOrders?.value || 0;
              const target = 150000;
              const completion = target ? Math.min(100, (salesValue / target) * 100) : 0;

              return (
                <div key={rep.id} className="flex items-center gap-4 group">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-muted group-hover:bg-primary/10 transition-colors flex items-center justify-center text-lg font-bold text-primary">
                      {rep.full_name.charAt(0)}
                    </div>
                    <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-primary border-2 border-card flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                      {idx + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{rep.full_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${completion}%` }} />
                      </div>
                      <span className="text-[10px] font-medium text-primary">{completion.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-8 border-t border-border/50">
            <div className="bg-primary/5 rounded-2xl p-5 border border-primary/20">
              <p className="text-xs font-semibold text-primary mb-1">Team MVP</p>
              <p className="text-xl font-bold text-foreground">
                {fieldReps[0]?.full_name || 'No reps yet'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Targeted: {formatCurrency(250000)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-foreground">Field Status</h3>
              <p className="text-sm text-muted-foreground">Real-time force metrics</p>
            </div>
            <div className='flex gap-2'>
              <button
                onClick={() => setStatusTab('reps')}
                className={cn(
                  "text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors",
                  statusTab === 'reps' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                Reps
              </button>
              <button
                onClick={() => setStatusTab('history')}
                className={cn(
                  "text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors",
                  statusTab === 'history' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                Ping Log
              </button>
            </div>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto max-h-[500px] pr-2">
            {statusTab === 'reps' ? (
              fieldReps.map((rep, idx) => {
                const status = attendanceByEmployee[rep.id] || 'absent';
                const repOrders = ordersByRep[rep.id];
                const ordersToday = repOrders?.count || 0;
                const salesValue = repOrders?.value || 0;

                return (
                  <div key={rep.id} className="group p-5 bg-card rounded-2xl border border-border/50 hover:border-primary/30 transition-all duration-300 animate-slide-up" style={{ animationDelay: `${idx * 40}ms` }}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-lg font-bold text-primary group-hover:scale-110 transition-transform shadow-inner">
                            {rep.full_name.charAt(0)}
                          </div>
                          <div className={cn(
                            "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-card",
                            status === 'present' || status === 'field' ? 'bg-success' : status === 'leave' ? 'bg-warning' : 'bg-muted-foreground opacity-50'
                          )} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{rep.full_name}</p>
                          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-primary" />
                            {rep.department || 'Field Sales'}
                          </p>
                          {rep.phone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Phone className="w-3 h-3" /> {rep.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{formatCurrency(salesValue)}</p>
                        <p className="text-xs text-muted-foreground">Current Shift</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/50">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Active Orders</span>
                        <span className="text-sm font-semibold text-foreground">{ordersToday}</span>
                      </div>
                      <div className="flex flex-col text-center">
                        <span className="text-xs text-muted-foreground">Status</span>
                        <span className={cn(
                          'text-sm font-semibold',
                          status === 'present' || status === 'field' ? 'text-success' : 'text-muted-foreground'
                        )}>{status}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-xs text-muted-foreground">Call</span>
                        <span className="text-sm font-semibold text-primary inline-flex items-center gap-1">
                          <Phone className="w-3 h-3" /> Quick Dial
                        </span>
                        {rep.user_id && (
                          <button
                            onClick={() => requestLocation(rep.user_id!)}
                            className="mt-2 text-xs font-medium text-muted-foreground hover:text-primary flex items-center justify-end gap-1 transition-colors"
                            disabled={isRequestingLocation}
                          >
                            <LocateFixed className="w-3 h-3" /> Ping Location
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="space-y-3">
                {historyLocations.map((loc, idx) => {
                  const rep = employees.find(e => e.user_id === loc.user_id);
                  const repName = rep?.full_name || 'Unknown Agent';
                  return <LocationLogItem key={loc.id || idx} loc={loc} repName={repName} />;
                })}
                {historyLocations.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No recent pings.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-foreground tracking-tight">Order Desk</h3>

              <p className="text-xs text-muted-foreground">Awaiting field reconciliation</p>
            </div>
            <button className="h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
              <Package className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto pr-2">
            {pendingOrders.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">No pending orders</div>
            ) : (
              pendingOrders.map((order, idx) => (
                <div key={order.id} className="group p-5 bg-card/80 border border-border/50 rounded-2xl hover:border-primary/30 transition-all duration-300 animate-slide-up" style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{order.customer?.name || 'Walk-in customer'}</p>
                      <p className="text-xs text-muted-foreground mt-1">{order.order_number || order.id}</p>
                    </div>
                    <p className="text-sm font-semibold text-primary">{formatCurrency(order.total_amount)}</p>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <span className={cn(
                      'text-xs font-medium px-2.5 py-1 rounded-lg',
                      order.status === 'pending' && 'bg-warning/10 text-warning border border-warning/20',
                      order.status === 'approved' && 'bg-success/10 text-success border border-success/20',
                      order.status === 'dispatched' && 'bg-primary/10 text-primary border border-primary/20',
                    )}>
                      {order.status}
                    </span>

                    {order.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(order.id)}
                          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-success/10 text-success text-xs font-medium hover:bg-success hover:text-white transition-all disabled:opacity-60"
                          disabled={updateStatus.isPending}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Release
                        </button>
                        <button
                          onClick={() => handleDispatch(order.id)}
                          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary hover:text-white transition-all disabled:opacity-60"
                          disabled={updateStatus.isPending}
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          Dispatch
                        </button>
                        <button className="h-8 w-8 rounded-lg bg-destructive/5 text-destructive hover:bg-destructive hover:text-white transition-all border border-destructive/10 flex items-center justify-center">
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <button className="w-full mt-6 py-4 bg-muted/30 rounded-2xl text-xs font-semibold uppercase text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all tracking-wider">
            View Fulfillment Queue
          </button>
        </div>

        <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-foreground">Field Notes</h3>
              <p className="text-xs text-muted-foreground">Latest logged visits & feedback</p>
            </div>
            <button
              onClick={() => setIsNoteModalOpen(true)}
              className="h-10 w-10 rounded-xl bg-secondary/60 hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center"
            >
              <Notebook className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {salesFeedback.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">No field notes yet.</div>
            ) : (
              salesFeedback.map((note, idx) => (
                <div
                  key={note.id}
                  className="p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 animate-slide-up"
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{note.sales_rep?.full_name || 'Sales Rep'}</p>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <Notebook className="w-3 h-3" /> {note.feedback_type.replace('_', ' ')}
                      </p>
                      {note.customer?.name && (
                        <p className="text-[11px] text-primary mt-1">Customer: {note.customer.name}</p>
                      )}
                    </div>
                    <span className={cn(
                      'text-[11px] px-2 py-1 rounded-full font-semibold',
                      note.status === 'open' && 'bg-warning/10 text-warning',
                      note.status === 'in_progress' && 'bg-primary/10 text-primary',
                      note.status === 'closed' && 'bg-success/10 text-success'
                    )}>
                      {note.status?.replace('_', ' ') || 'open'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{note.content}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {note.follow_up_date ? new Date(note.follow_up_date).toLocaleDateString() : 'No follow-up'}
                    </span>
                    <span>{new Date(note.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <LogFieldNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        reps={fieldReps}
      />
    </div>
  );
}

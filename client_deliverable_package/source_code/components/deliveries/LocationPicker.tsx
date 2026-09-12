
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Navigation, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Fix Leaflet marker icon issue
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Location {
    lat: number;
    lng: number;
    address: string;
}

interface LocationPickerProps {
    onLocationSelect: (location: Location) => void;
    initialLocation?: { lat: number; lng: number; address: string };
}

// Component to handle map center updates
function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, 15);
    }, [center, map]);
    return null;
}

// Component to handle map clicks
function ClickHandler({ onClick }: { onClick: (latlng: L.LatLng) => void }) {
    useMapEvents({
        click(e) {
            onClick(e.latlng);
        },
    });
    return null;
}

export function LocationPicker({ onLocationSelect, initialLocation }: LocationPickerProps) {
    const [searchQuery, setSearchQuery] = useState(initialLocation?.address || '');
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    // Nairobi bounds for prioritizing search
    const NAIROBI_VIEWBOX = '36.6500,-1.1600,37.1000,-1.4500';

    const [coords, setCoords] = useState<[number, number]>(() => {
        if (initialLocation?.lat && initialLocation?.lng) {
            return [initialLocation.lat, initialLocation.lng];
        }

        // Try to get from local storage for "quick load"
        try {
            const saved = localStorage.getItem('lastMapLocation');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.lat && parsed.lng) {
                    return [parsed.lat, parsed.lng];
                }
            }
        } catch (e) {
            console.error('Failed to load map location', e);
        }

        return [-1.286389, 36.817223]; // Default to Nairobi
    });

    const [address, setAddress] = useState(initialLocation?.address || '');

    // Save location to local storage
    const saveToLocal = (lat: number, lng: number) => {
        try {
            localStorage.setItem('lastMapLocation', JSON.stringify({ lat, lng }));
        } catch (e) {
            console.error('Failed to save map location', e);
        }
    };

    // Sync state when initialLocation prop changes (e.g. async fetch)
    useEffect(() => {
        if (initialLocation?.lat && initialLocation?.lng) {
            setCoords([initialLocation.lat, initialLocation.lng]);
            setAddress(initialLocation.address || '');
            setSearchQuery(initialLocation.address || '');
        }
    }, [initialLocation?.lat, initialLocation?.lng, initialLocation?.address]);

    const searchLocation = async (query: string) => {
        if (!query) return;
        setIsSearching(true);
        try {
            // Added viewbox to prioritize Nairobi, kept countrycodes for Kenya
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ke&viewbox=${NAIROBI_VIEWBOX}&bounded=0&priorityclass=place&limit=5`;
            const response = await fetch(url);
            const data = await response.json();
            setResults(data);
        } catch (error) {
            console.error('Geocoding error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const reverseGeocode = async (lat: number, lng: number) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );
            const data = await response.json();
            const newAddress = data.display_name;
            setAddress(newAddress);
            setSearchQuery(newAddress);
            onLocationSelect({ lat, lng, address: newAddress });
            saveToLocal(lat, lng);
        } catch (error) {
            console.error('Reverse geocoding error:', error);
        }
    };

    // Auto-search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery && searchQuery.length > 3 && !address.includes(searchQuery)) {
                searchLocation(searchQuery);
            } else if (!searchQuery) {
                setResults([]);
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [searchQuery, address]);

    const handleResultClick = (result: any) => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        setCoords([lat, lng]);
        const shortName = result.display_name;
        setAddress(shortName);
        setSearchQuery(shortName);
        setResults([]);
        onLocationSelect({ lat, lng, address: shortName });
        saveToLocal(lat, lng);
    };

    const handleMapClick = (latlng: L.LatLng) => {
        setCoords([latlng.lat, latlng.lng]);
        reverseGeocode(latlng.lat, latlng.lng);
        saveToLocal(latlng.lat, latlng.lng);
    };

    return (
        <div className="space-y-4 w-full">
            <div className="relative">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Type address (e.g. Nairobi CBD)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-field pl-10 pr-10 focus:ring-2 focus:ring-primary/20"
                    />
                    {isSearching && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        </div>
                    )}
                </div>

                {results.length > 0 && (
                    <div className="absolute z-[1000] w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                        {results.map((result, idx) => (
                            <button
                                key={idx}
                                type="button"
                                className="w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors border-b border-border/50 last:border-0"
                                onClick={() => handleResultClick(result)}
                            >
                                <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                                    <span>{result.display_name}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="relative rounded-xl overflow-hidden border border-border h-[300px] bg-muted/50">
                <MapContainer
                    center={coords}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker
                        position={coords}
                        draggable={true}
                        eventHandlers={{
                            dragend: (e) => {
                                const marker = e.target;
                                const position = marker.getLatLng();
                                handleMapClick(position);
                            },
                        }}
                    />
                    <MapUpdater center={coords} />
                    <ClickHandler onClick={handleMapClick} />
                </MapContainer>

                <div className="absolute bottom-4 left-4 z-[1000]">
                    <div className="bg-background/80 backdrop-blur-sm p-2 rounded-lg border border-border shadow-sm text-[10px] text-muted-foreground">
                        <p className="font-medium text-foreground">Drag pin or click map to adjust</p>
                        <p>{(Number(coords[0]) || 0).toFixed(6)}, {(Number(coords[1]) || 0).toFixed(6)}</p>
                    </div>
                </div>
            </div>

            {address && (
                <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <Check className="w-4 h-4 text-primary mt-1 shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        <span className="font-medium text-foreground block mb-0.5">Selected Location:</span>
                        {address}
                    </p>
                </div>
            )}
        </div>
    );
}

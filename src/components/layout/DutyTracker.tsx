import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMyAttendanceToday } from '@/hooks/useEmployees';
import { useSaveLocation } from '@/hooks/useUserLocations';

const TRACKING_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours
const CHECK_INTERVAL = 60 * 1000; // Check every minute
const STORAGE_KEY = 'last_location_tracked_at';

export default function DutyTracker() {
    const { user, userRole } = useAuth();
    const { data: attendance } = useMyAttendanceToday();
    const saveLocation = useSaveLocation();

    useEffect(() => {
        // Only track for sales reps (or delivery agents if requested elsewhere)
        if (!user || userRole !== 'sales_rep') return;

        const trackLocation = () => {
            const isOnDuty = !!attendance?.check_in && !attendance?.check_out && attendance?.status === 'present';

            if (!isOnDuty) return;

            const lastTracked = localStorage.getItem(STORAGE_KEY);
            const now = Date.now();

            if (!lastTracked || (now - Number(lastTracked)) >= TRACKING_INTERVAL) {
                if ('geolocation' in navigator) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            saveLocation.mutate({
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude
                            }, {
                                onSuccess: () => {
                                    localStorage.setItem(STORAGE_KEY, String(now));
                                    console.log('DutyTracker: Location captured and saved.');
                                }
                            });
                        },
                        (error) => {
                            console.error('DutyTracker: Geolocation error:', error);
                        },
                        { enableHighAccuracy: true }
                    );
                } else {
                    console.error('DutyTracker: Geolocation not supported.');
                }
            }
        };

        // Run check immediately
        trackLocation();

        // And every minute
        const intervalId = setInterval(trackLocation, CHECK_INTERVAL);

        return () => clearInterval(intervalId);
    }, [user, userRole, attendance, saveLocation]);

    return null; // Headless component
}

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMyAttendanceToday, useClockOut } from '@/hooks/useEmployees';
import { useSaveLocation } from '@/hooks/useUserLocations';

const TRACKING_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours
const CHECK_INTERVAL = 60 * 1000; // Check every minute
const STORAGE_KEY = 'last_location_tracked_at';

export default function DutyTracker() {
    const { user, userRole } = useAuth();
    const { data: attendance } = useMyAttendanceToday();
    const saveLocation = useSaveLocation();
    const clockOut = useClockOut();
    const autoClockOutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Auto clock-out at 9pm for clerk
    useEffect(() => {
        if (userRole !== 'clerk') return;
        if (!attendance?.check_in || attendance?.check_out) return;

        const now = new Date();
        const ninepm = new Date(now);
        ninepm.setHours(21, 0, 0, 0);
        const msUntil9pm = ninepm.getTime() - now.getTime();

        if (msUntil9pm > 0) {
            autoClockOutRef.current = setTimeout(() => {
                clockOut.mutate();
            }, msUntil9pm);
        }

        return () => {
            if (autoClockOutRef.current) clearTimeout(autoClockOutRef.current);
        };
    }, [userRole, attendance?.check_in, attendance?.check_out]);

    // Location tracking for sales reps
    useEffect(() => {
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
                                }
                            });
                        },
                        (error) => {
                            console.error('DutyTracker: Geolocation error:', error);
                        },
                        { enableHighAccuracy: true }
                    );
                }
            }
        };

        trackLocation();
        const intervalId = setInterval(trackLocation, CHECK_INTERVAL);
        return () => clearInterval(intervalId);
    }, [user, userRole, attendance, saveLocation]);

    return null;
}

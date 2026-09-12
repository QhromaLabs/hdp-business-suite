import { useState, useEffect } from 'react';
import { useMyAttendanceToday, useClockIn, useCurrentEmployee } from '@/hooks/useEmployees';
import { LogIn, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const clockInKey = (userId: string, date: string) =>
  `hdp_clocked_in_${userId}_${date}`;

interface ClockInModalProps {
  userName?: string;
}

export function ClockInModal({ userName }: ClockInModalProps) {
  const { data: employee, isLoading: isEmployeeLoading } = useCurrentEmployee();
  const { data: attendance, isLoading: isAttendanceLoading } = useMyAttendanceToday();
  const clockIn = useClockIn();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dismissed, setDismissed] = useState(false);

  const today = new Date().toLocaleDateString('en-CA');

  // On mount (or when employee resolves), check localStorage for today's clock-in mark
  useEffect(() => {
    if (!employee?.id) return;
    if (localStorage.getItem(clockInKey(employee.id, today)) === 'true') {
      setDismissed(true);
    }
  }, [employee?.id, today]);

  // When DB confirms a check_in exists, persist the mark so reloads don't re-show modal
  useEffect(() => {
    if (!employee?.id || !attendance?.check_in) return;
    localStorage.setItem(clockInKey(employee.id, today), 'true');
    setDismissed(true);
  }, [attendance?.check_in, employee?.id, today]);

  // Live clock tick
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const isReady = !isEmployeeLoading && !!employee && !isAttendanceLoading;
  const isVisible = isReady && !dismissed && !clockIn.isSuccess;
  if (!isVisible) return null;

  const greeting = () => {
    const h = currentTime.getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleClockIn = () => {
    clockIn.mutate(undefined, {
      onSuccess: () => {
        if (employee?.id) {
          localStorage.setItem(clockInKey(employee.id, today), 'true');
        }
        setDismissed(true);
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border p-8 max-w-sm w-full mx-4 shadow-2xl animate-slide-up">
        <div className="flex flex-col items-center text-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Clock className="w-10 h-10 text-primary" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {greeting()}{userName ? `, ${userName.split(' ')[0]}` : ''}!
            </h2>
            <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
              Clock in to begin your shift and record your attendance for today.
            </p>
          </div>

          <div className="text-4xl font-mono font-bold text-primary tracking-wider">
            {currentTime.toLocaleTimeString('en-KE', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })}
          </div>

          <Button
            onClick={handleClockIn}
            disabled={clockIn.isPending}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 rounded-xl shadow-lg text-base"
          >
            <LogIn className="w-5 h-5 mr-2" />
            {clockIn.isPending ? 'Clocking In...' : 'Clock In Now'}
          </Button>

          <p className="text-xs text-muted-foreground">
            Your shift will be automatically closed at <strong>9:00 PM</strong> if you haven't clocked out.
          </p>
        </div>
      </div>
    </div>
  );
}

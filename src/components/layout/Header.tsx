import { Bell, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isNotificationsClosing, setIsNotificationsClosing] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: '1', title: 'Low Stock Alert', body: 'DRY-RICE-5K dropped below 50 units.', time: '2m ago', read: false, tone: 'warning' },
    { id: '2', title: 'New Order', body: 'SO-1034 processed successfully.', time: '12m ago', read: false, tone: 'primary' },
    { id: '3', title: 'Payment Received', body: 'KSh 45,000 via Bank for SO-1028.', time: '32m ago', read: true, tone: 'success' },
  ]);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        if (isNotificationsOpen && !isNotificationsClosing) {
          closeNotifications();
        }
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isNotificationsOpen, isNotificationsClosing]);

  const openNotifications = () => {
    setIsNotificationsClosing(false);
    setIsNotificationsOpen(true);
  };

  const closeNotifications = () => {
    setIsNotificationsClosing(true);
    setTimeout(() => {
      setIsNotificationsOpen(false);
      setIsNotificationsClosing(false);
    }, 140);
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products, customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 w-64"
          />
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              if (isNotificationsOpen && !isNotificationsClosing) {
                closeNotifications();
              } else {
                openNotifications();
              }
            }}
            className="relative p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Bell className={cn("w-5 h-5", unreadCount ? "text-primary" : "text-muted-foreground")} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-5 px-1 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          {(isNotificationsOpen || isNotificationsClosing) && (
            <div
              className={cn(
                "absolute right-0 mt-2 w-96 bg-popover border border-border rounded-2xl shadow-2xl p-4 z-50 transform origin-top-right transition-all duration-150 ease-out",
                isNotificationsClosing
                  ? "opacity-0 scale-95 -translate-y-1"
                  : "opacity-100 scale-100 translate-y-0"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-foreground">Notifications</p>
                <Button variant="ghost" size="sm" onClick={markAllRead}>
                  Mark all read
                </Button>
              </div>
              <div className="space-y-3 max-h-[50vh] overflow-y-auto scrollbar-thin">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={cn(
                      "p-3 rounded-xl border border-border/70 bg-card/80",
                      !notif.read && "shadow-sm ring-1 ring-primary/10"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2 py-0.5 text-[11px] font-semibold rounded-full",
                            notif.tone === 'warning' && "bg-warning/10 text-warning",
                            notif.tone === 'success' && "bg-success/10 text-success",
                            notif.tone === 'primary' && "bg-primary/10 text-primary"
                          )}>
                            {notif.title}
                          </span>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                          )}
                        </div>
                        <p className="text-sm text-foreground">{notif.body}</p>
                        <p className="text-xs text-muted-foreground">{notif.time}</p>
                      </div>
                      {!notif.read && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))}
                        >
                          Mark read
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">You are all caught up.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Current Date/Time */}
        <div className="hidden lg:block text-right">
          <p className="text-sm font-medium text-foreground">
            {new Date().toLocaleDateString('en-KE', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleTimeString('en-KE', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        </div>
      </div>
    </header>
  );
}

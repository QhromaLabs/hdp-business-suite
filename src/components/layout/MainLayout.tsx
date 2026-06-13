import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import DutyTracker from './DutyTracker';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/pos': 'Point of Sale',
  '/customers': 'Customer Management',
  '/inventory': 'Inventory Management',
  '/manufacturing': 'Manufacturing',
  '/accounting': 'Accounting & Finance',
  '/hr': 'HR & Payroll',
  '/field-sales': 'Field Sales',
  '/audit': 'Audit & Compliance',
  '/reports': 'Reports & Analytics',
  '/settings': 'Settings',
  '/profile': 'My Profile',
  '/orders': 'All Orders',
  '/mobile-apps': 'Mobile Apps',
};

export default function MainLayout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'HDP(K) ERP';
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        isPinned={isPinned} 
        setIsPinned={setIsPinned} 
        isHovered={isHovered} 
        setIsHovered={setIsHovered} 
      />
      <div className={cn(
        "min-h-screen flex flex-col transition-all duration-300",
        isPinned ? "ml-64" : "ml-20"
      )}>
        <Header title={title} />
        <main className="flex-1 p-6">
          <DutyTracker />
          <Outlet />
        </main>
      </div>
    </div>
  );
}

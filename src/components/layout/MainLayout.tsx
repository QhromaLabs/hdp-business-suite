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
};

export default function MainLayout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'HDP(K) ERP';
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className={cn(
        "min-h-screen flex flex-col transition-all duration-300",
        collapsed ? "ml-20" : "ml-64"
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

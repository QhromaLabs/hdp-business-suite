import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useLocation } from 'react-router-dom';

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
};

export default function MainLayout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'HDP(K) ERP';

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-64 min-h-screen flex flex-col">
        <Header title={title} />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

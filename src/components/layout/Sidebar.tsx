import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Folder,
  Factory,
  Calculator,
  UserCircle,
  MapPin,
  ClipboardCheck,
  BarChart3,
  Settings,
  LogOut,
  ClipboardList,
  ShoppingBag,
  Truck,
  Wallet,
  Banknote,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  roles?: string[];
  children?: { label: string; path: string }[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Point of Sale', icon: ShoppingCart, path: '/pos' },
  { label: 'All Orders', icon: ClipboardList, path: '/orders' },
  { label: 'Customers', icon: Users, path: '/customers' },
  { label: 'Inventory', icon: Package, path: '/inventory' },
  { label: 'Purchases', icon: ShoppingBag, path: '/purchases', roles: ['admin', 'manager'] },
  { label: 'Categories', icon: Folder, path: '/categories' },
  { label: 'Manufacturing', icon: Factory, path: '/manufacturing', roles: ['admin', 'manager'] },
  { label: 'Accounting', icon: Calculator, path: '/accounting', roles: ['admin', 'manager'] },
  { label: 'Employees', icon: Users, path: '/hr', roles: ['admin', 'manager'] },
  { label: 'Payroll', icon: Wallet, path: '/payroll', roles: ['admin', 'manager'] },
  { label: 'Field Sales', icon: MapPin, path: '/field-sales' },
  { label: 'Commissions', icon: Banknote, path: '/commissions' },
  { label: 'Deliveries', icon: Truck, path: '/deliveries' },
  { label: 'Audit', icon: ClipboardCheck, path: '/audit', roles: ['admin', 'manager'] },
  { label: 'Reports', icon: BarChart3, path: '/reports' },
  { label: 'Settings', icon: Settings, path: '/settings', roles: ['admin'] },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const { profile, userRole, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const filteredNavItems = navItems.filter(
    item => !item.roles || item.roles.includes(userRole || '')
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-primary text-primary-foreground';
      case 'manager': return 'bg-success text-success-foreground';
      case 'clerk': return 'bg-warning text-warning-foreground';
      case 'sales_rep': return 'bg-accent text-accent-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-sidebar flex flex-col transition-all duration-300 z-50",
      collapsed ? "w-20" : "w-64"
    )}>
      {/* Header with Logo and Collapse Toggle */}
      <div className="h-16 flex items-center border-b border-sidebar-border px-4 relative">
        <div className={cn(
          "flex items-center transition-all duration-300 w-full",
          collapsed ? "justify-center" : "justify-start gap-4"
        )}>
          <div className={cn(
            "flex items-center justify-center transition-all duration-300",
            collapsed ? "w-8 h-8" : "w-28 h-28"
          )}>
            <img src="/brand/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "p-1.5 rounded-full hover:bg-sidebar-accent transition-all duration-300 flex items-center justify-center shadow-md",
              collapsed
                ? "absolute -right-3 top-6 bg-sidebar border border-sidebar-border z-[60] text-orange-500"
                : "ml-auto text-orange-500 hover:rotate-180"
            )}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto scrollbar-thin">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={cn(
                    "sidebar-link",
                    isActive && "sidebar-link-active"
                  )}
                >
                  <Icon className={cn(
                    "flex-shrink-0 transition-transform duration-300",
                    collapsed ? "w-[21px] h-[21px] scale-105" : "w-5 h-5"
                  )} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => navigate('/profile')}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent hover:bg-sidebar-accent/80 transition-all",
            collapsed && "justify-center"
          )}
        >
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-semibold">
              {profile?.full_name?.charAt(0) || 'U'}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 animate-fade-in text-left">
              <p className="text-sidebar-foreground font-medium text-sm truncate">
                {profile?.full_name || 'User'}
              </p>
              <span className={cn(
                "inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase mt-1",
                getRoleBadgeColor(userRole || '')
              )}>
                {userRole?.replace('_', ' ') || 'loading...'}
              </span>
            </div>
          )}
        </button>
        <button
          onClick={signOut}
          className={cn(
            "w-full mt-2 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-muted hover:text-destructive hover:bg-destructive/10 transition-all duration-200",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}

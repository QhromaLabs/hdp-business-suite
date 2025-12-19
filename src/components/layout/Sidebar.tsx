import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Factory,
  Calculator,
  UserCircle,
  MapPin,
  ClipboardCheck,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

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
  { label: 'Customers', icon: Users, path: '/customers' },
  { label: 'Inventory', icon: Package, path: '/inventory' },
  { label: 'Manufacturing', icon: Factory, path: '/manufacturing', roles: ['admin', 'manager'] },
  { label: 'Accounting', icon: Calculator, path: '/accounting', roles: ['admin', 'manager'] },
  { label: 'HR & Payroll', icon: UserCircle, path: '/hr', roles: ['admin', 'manager'] },
  { label: 'Field Sales', icon: MapPin, path: '/field-sales' },
  { label: 'Audit', icon: ClipboardCheck, path: '/audit', roles: ['admin', 'manager'] },
  { label: 'Reports', icon: BarChart3, path: '/reports' },
  { label: 'Settings', icon: Settings, path: '/settings', roles: ['admin'] },
];

export default function Sidebar() {
  const { profile, userRole, signOut } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

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
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-sidebar-border px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">H</span>
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="text-sidebar-foreground font-bold text-lg">HDP(K) LTD</h1>
              <p className="text-sidebar-muted text-xs">Enterprise ERP</p>
            </div>
          )}
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
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-sidebar-border">
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent",
          collapsed && "justify-center"
        )}>
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-semibold">
              {profile?.full_name?.charAt(0) || 'U'}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 animate-fade-in">
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
        </div>
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

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
  PanelLeftClose,
  PanelLeft,
  Smartphone,
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

interface NavGroup {
  name: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    name: "Overview",
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { label: 'Reports', icon: BarChart3, path: '/reports' },
    ]
  },
  {
    name: "Sales & Orders",
    items: [
      { label: 'Point of Sale', icon: ShoppingCart, path: '/pos' },
      { label: 'All Orders', icon: ClipboardList, path: '/orders' },
      { label: 'Customers', icon: Users, path: '/customers' },
      { label: 'Field Sales', icon: MapPin, path: '/field-sales' },
      { label: 'Deliveries', icon: Truck, path: '/deliveries' },
    ]
  },
  {
    name: "Inventory & Production",
    items: [
      { label: 'Inventory', icon: Package, path: '/inventory' },
      { label: 'Categories', icon: Folder, path: '/categories' },
      { label: 'Purchases', icon: ShoppingBag, path: '/purchases', roles: ['admin', 'manager'] },
      { label: 'Manufacturing', icon: Factory, path: '/manufacturing', roles: ['admin', 'manager'] },
    ]
  },
  {
    name: "Finance & HR",
    items: [
      { label: 'Accounting', icon: Calculator, path: '/accounting', roles: ['admin', 'manager', 'clerk'] },
      { label: 'Employees', icon: Users, path: '/hr', roles: ['admin', 'manager'] },
      { label: 'Payroll', icon: Wallet, path: '/payroll', roles: ['admin', 'manager'] },
      { label: 'Commissions', icon: Banknote, path: '/commissions' },
    ]
  },
  {
    name: "System",
    items: [
      { label: 'Audit', icon: ClipboardCheck, path: '/audit', roles: ['admin', 'manager'] },
      { label: 'Mobile Apps', icon: Smartphone, path: '/mobile-apps', roles: ['admin'] },
      { label: 'Settings', icon: Settings, path: '/settings', roles: ['admin'] },
    ]
  }
];

interface SidebarProps {
  isPinned: boolean;
  setIsPinned: (pinned: boolean) => void;
  isHovered: boolean;
  setIsHovered: (hovered: boolean) => void;
}

export default function Sidebar({ isPinned, setIsPinned, isHovered, setIsHovered }: SidebarProps) {
  const { profile, userRole, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // No longer using filteredNavItems directly, we filter per group

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-primary text-primary-foreground';
      case 'manager': return 'bg-success text-success-foreground';
      case 'clerk': return 'bg-warning text-warning-foreground';
      case 'sales_rep': return 'bg-accent text-accent-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const expanded = isPinned || isHovered;

  return (
    <aside 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar flex flex-col transition-all duration-300 z-50",
        expanded ? "w-64" : "w-20",
        !isPinned && isHovered && "shadow-2xl border-r border-sidebar-border/50"
      )}>
      {/* Header with Logo and Collapse Toggle */}
      <div className="h-16 flex items-center border-b border-sidebar-border px-4 relative">
        <div className={cn(
          "flex items-center transition-all duration-300 w-full",
          expanded ? "justify-start gap-4" : "justify-center"
        )}>
          <div className={cn(
            "flex items-center justify-center transition-all duration-300",
            expanded ? "w-28 h-28" : "w-8 h-8"
          )}>
            <img src="/brand/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          {expanded && (
            <button
              onClick={() => setIsPinned(!isPinned)}
              className={cn(
                "p-1.5 rounded-md hover:bg-sidebar-accent transition-all duration-300 flex items-center justify-center shadow-sm border border-transparent ml-auto",
                isPinned ? "text-primary bg-primary/10 border-primary/20" : "text-muted-foreground hover:text-foreground"
              )}
              title={isPinned ? "Unpin Sidebar" : "Pin Sidebar"}
            >
              {isPinned ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto scrollbar-hide">
        <div className="space-y-1">
          {navGroups.map((group, groupIdx) => {
            const visibleItems = group.items.filter(
              item => !item.roles || item.roles.includes(userRole || '')
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={group.name} className={cn("mb-8", groupIdx !== 0 && "mt-8")}>
                {groupIdx !== 0 && (
                  <div className={cn(
                    "h-[1px] bg-sidebar-border opacity-40 mb-6",
                    !expanded ? "w-8 mx-auto" : "w-full"
                  )} />
                )}
                {expanded && (
                  <p className="px-4 text-[10px] font-bold text-sidebar-muted uppercase tracking-widest mb-3 opacity-60">
                    {group.name}
                  </p>
                )}
                <ul className="space-y-1">
                  {visibleItems.map((item) => {
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
                            !expanded ? "w-[21px] h-[21px] scale-105" : "w-5 h-5"
                          )} />
                          {expanded && <span className="truncate font-medium">{item.label}</span>}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => navigate('/profile')}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent hover:bg-sidebar-accent/80 transition-all",
            !expanded && "justify-center"
          )}
        >
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-semibold">
              {profile?.full_name?.charAt(0) || 'U'}
            </span>
          </div>
          {expanded && (
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
            !expanded && "justify-center"
          )}
        >
          <LogOut className="w-5 h-5" />
          {expanded && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}

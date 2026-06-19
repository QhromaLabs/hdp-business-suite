import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import MainLayout from "./components/layout/MainLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Customers from "./pages/Customers";
import Inventory from "./pages/Inventory";
import Purchases from './pages/Purchases';
import Categories from "./pages/Categories";
import DeviceId from "./pages/DeviceId";
import MyIp from "./pages/MyIp";
import Manufacturing from "@/pages/Manufacturing";
import Accounting from "./pages/Accounting";
import HR from "./pages/HR";
import FieldSales from "./pages/FieldSales";
import Deliveries from "./pages/Deliveries";
import Audit from "./pages/Audit";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import Changelog from "./pages/Changelog";
import MobileApps from "./pages/MobileApps";

import Orders from "./pages/Orders";
import Commissions from "./pages/Commissions";
import Payroll from "./pages/Payroll";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60,
      refetchOnWindowFocus: true,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "hdp-query-cache",
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sidebar flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function RoleRoute({ children, allowed }: { children: React.ReactNode; allowed: string[] }) {
  const { userRole, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sidebar flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!userRole || !allowed.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sidebar flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Auth />}
      />
      <Route path="/device-id" element={<DeviceId />} />
      <Route path="/my-ip" element={<MyIp />} />
      <Route path="/changelog06/02/26" element={<Changelog />} />
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/auth"} replace />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="pos" element={<RoleRoute allowed={['admin', 'manager', 'sales_rep', 'clerk']}><POS /></RoleRoute>} />
        <Route path="customers" element={<RoleRoute allowed={['admin', 'manager', 'sales_rep', 'clerk']}><Customers /></RoleRoute>} />
        <Route path="inventory" element={<RoleRoute allowed={['admin', 'manager', 'sales_rep', 'clerk']}><Inventory /></RoleRoute>} />
        <Route path="purchases" element={<RoleRoute allowed={['admin', 'manager']}><Purchases /></RoleRoute>} />
        <Route path="categories" element={<RoleRoute allowed={['admin', 'manager']}><Categories /></RoleRoute>} />
        <Route path="manufacturing" element={<RoleRoute allowed={['admin', 'manager']}><Manufacturing /></RoleRoute>} />
        <Route path="accounting" element={<RoleRoute allowed={['admin', 'manager']}><Accounting /></RoleRoute>} />
        <Route path="hr" element={<RoleRoute allowed={['admin', 'manager']}><HR /></RoleRoute>} />
        <Route path="field-sales" element={<RoleRoute allowed={['admin', 'manager', 'sales_rep']}><FieldSales /></RoleRoute>} />
        <Route path="deliveries" element={<RoleRoute allowed={['admin', 'manager', 'sales_rep']}><Deliveries /></RoleRoute>} />
        <Route path="audit" element={<RoleRoute allowed={['admin', 'manager']}><Audit /></RoleRoute>} />
        <Route path="reports" element={<RoleRoute allowed={['admin', 'manager', 'sales_rep']}><Reports /></RoleRoute>} />
        <Route path="settings" element={<RoleRoute allowed={['admin']}><Settings /></RoleRoute>} />
        <Route path="profile" element={<Profile />} />

        <Route path="orders" element={<Orders />} />
        <Route path="commissions" element={<RoleRoute allowed={['admin', 'manager', 'sales_rep']}><Commissions /></RoleRoute>} />
        <Route path="payroll" element={<RoleRoute allowed={['admin', 'manager']}><Payroll /></RoleRoute>} />
        <Route path="mobile-apps" element={<RoleRoute allowed={['admin']}><MobileApps /></RoleRoute>} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
  >
    <SettingsProvider>
      <ThemeProvider defaultTheme="dark" storageKey="hdp-theme">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner position="top-center" />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </SettingsProvider>
  </PersistQueryClientProvider>
);

export default App;

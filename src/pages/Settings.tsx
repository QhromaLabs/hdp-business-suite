import { 
  Settings as SettingsIcon,
  Building2,
  Users,
  Shield,
  Database,
  Bell,
  Palette,
  Globe,
  Key,
  Smartphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const settingsSections = [
  {
    title: 'Company',
    icon: Building2,
    items: [
      { name: 'Company Profile', description: 'Business name, logo, and contact details' },
      { name: 'Branches', description: 'Manage multiple locations' },
      { name: 'Tax Settings', description: 'VAT and tax configuration' },
    ],
  },
  {
    title: 'Users & Roles',
    icon: Users,
    items: [
      { name: 'User Management', description: 'Add, edit, or remove users' },
      { name: 'Role Permissions', description: 'Configure access levels' },
      { name: 'Activity Log', description: 'Monitor user activities' },
    ],
  },
  {
    title: 'Security',
    icon: Shield,
    items: [
      { name: 'Device Management', description: 'Authorized devices and restrictions' },
      { name: 'Password Policy', description: 'Strength and expiry rules' },
      { name: 'Two-Factor Auth', description: 'Enable 2FA for all users' },
    ],
  },
  {
    title: 'Data',
    icon: Database,
    items: [
      { name: 'Backup Settings', description: 'Automated backup configuration' },
      { name: 'Data Export', description: 'Export company data' },
      { name: 'Data Retention', description: 'Archival and deletion policies' },
    ],
  },
  {
    title: 'Notifications',
    icon: Bell,
    items: [
      { name: 'Email Notifications', description: 'Configure email alerts' },
      { name: 'SMS Alerts', description: 'Transaction and stock alerts' },
      { name: 'Push Notifications', description: 'Mobile app notifications' },
    ],
  },
  {
    title: 'Integrations',
    icon: Globe,
    items: [
      { name: 'Payment Gateways', description: 'M-Pesa, bank integrations' },
      { name: 'Biometric Devices', description: 'Attendance hardware' },
      { name: 'API Access', description: 'Third-party integrations' },
    ],
  },
];

export default function Settings() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground">Manage your ERP system configuration</p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsSections.map((section, index) => {
          const Icon = section.icon;
          return (
            <div
              key={section.title}
              className="bg-card rounded-xl border border-border overflow-hidden animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="p-4 bg-muted/30 border-b border-border flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{section.title}</h3>
              </div>
              <div className="divide-y divide-border">
                {section.items.map((item) => (
                  <button
                    key={item.name}
                    className="w-full p-4 text-left hover:bg-muted/30 transition-colors"
                  >
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Register Device', icon: Smartphone },
            { label: 'API Keys', icon: Key },
            { label: 'Theme', icon: Palette },
            { label: 'System Logs', icon: Database },
          ].map((action) => {
            const ActionIcon = action.icon;
            return (
              <button
                key={action.label}
                className="p-4 bg-muted/30 rounded-xl flex flex-col items-center gap-2 hover:bg-muted/50 transition-colors"
              >
                <ActionIcon className="w-6 h-6 text-primary" />
                <span className="text-sm font-medium text-foreground">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* System Info */}
      <div className="bg-muted/30 rounded-xl p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">System Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Version</p>
            <p className="font-medium text-foreground">v2.1.0</p>
          </div>
          <div>
            <p className="text-muted-foreground">License</p>
            <p className="font-medium text-foreground">Enterprise</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last Backup</p>
            <p className="font-medium text-foreground">Today, 03:00 AM</p>
          </div>
          <div>
            <p className="text-muted-foreground">Support</p>
            <p className="font-medium text-primary">support@hdpk.co.ke</p>
          </div>
        </div>
      </div>
    </div>
  );
}

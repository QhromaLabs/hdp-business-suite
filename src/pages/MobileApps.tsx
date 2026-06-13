import { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  Link2,
  Copy,
  Check,
  ExternalLink,
  Edit3,
  Save,
  X,
  Share2,
  MapPin,
  Truck,
  Info,
  QrCode,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppConfig {
  id: 'sales' | 'delivery';
  name: string;
  subtitle: string;
  description: string;
  audience: string;
  icon: React.ElementType;
  accentColor: string;
  glowColor: string;
  features: string[];
}

interface AppLinks {
  sales: string;
  delivery: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'hdp_mobile_app_links';

const APP_CONFIGS: AppConfig[] = [
  {
    id: 'sales',
    name: 'HDP Field Sales',
    subtitle: 'Sales Agent App',
    description:
      'Mobile companion for sales representatives to manage field orders, customer visits, and live inventory checks.',
    audience: 'Sales Agents & Representatives',
    icon: MapPin,
    accentColor: 'from-orange-500 to-amber-500',
    glowColor: 'rgba(249,115,22,0.25)',
    features: ['Order management', 'Customer visits', 'Live stock check', 'Commission tracking'],
  },
  {
    id: 'delivery',
    name: 'HDP Delivery',
    subtitle: 'Delivery Personnel App',
    description:
      'Route optimisation and delivery confirmation tool for dispatch riders and logistics staff.',
    audience: 'Delivery Riders & Logistics Staff',
    icon: Truck,
    accentColor: 'from-blue-500 to-cyan-500',
    glowColor: 'rgba(59,130,246,0.25)',
    features: ['Route optimisation', 'Proof of delivery', 'Real-time GPS', 'Cash collection'],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadLinks(): AppLinks {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { sales: '', delivery: '' };
}

function saveLinks(links: AppLinks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CopyButton({ text, size = 'sm' }: { text: string; size?: 'sm' | 'md' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      disabled={!text}
      title={text ? 'Copy link' : 'No link set'}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-all duration-200',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        size === 'sm'
          ? 'h-8 px-3 text-xs bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80'
          : 'h-9 px-4 text-sm bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80'
      )}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-green-500" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          Copy Link
        </>
      )}
    </button>
  );
}

function ShareButton({ url, appName }: { url: string; appName: string }) {
  const canShare = typeof navigator.share === 'function';

  const handleShare = async () => {
    if (!url) return;
    if (canShare) {
      try {
        await navigator.share({
          title: `Download ${appName}`,
          text: `Download the ${appName} app via this link:`,
          url,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      // Fallback: compose a WhatsApp message
      const waUrl = `https://wa.me/?text=${encodeURIComponent(`Download the ${appName} app: ${url}`)}`;
      window.open(waUrl, '_blank');
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={!url}
      title={url ? 'Share link' : 'No link set'}
      className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg transition-all duration-200 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Share2 className="w-3.5 h-3.5" />
      Share
    </button>
  );
}

// ─── App Card ─────────────────────────────────────────────────────────────────

interface AppCardProps {
  config: AppConfig;
  link: string;
  onLinkChange: (id: AppConfig['id'], value: string) => void;
}

function AppCard({ config, link, onLinkChange }: AppCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(link);
  const Icon = config.icon;

  const handleSave = () => {
    if (draft && !isValidUrl(draft)) {
      toast.error('Please enter a valid URL (must start with https://)');
      return;
    }
    onLinkChange(config.id, draft.trim());
    setEditing(false);
    toast.success(`${config.name} link updated`);
  };

  const handleCancel = () => {
    setDraft(link);
    setEditing(false);
  };

  const hasLink = Boolean(link);

  return (
    <div
      className="relative bg-card rounded-2xl border border-border overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/20 group"
      style={{ boxShadow: `0 0 0 0 ${config.glowColor}` }}
    >
      {/* Gradient header strip */}
      <div className={cn('h-1.5 w-full bg-gradient-to-r', config.accentColor)} />

      <div className="p-6 space-y-5">
        {/* Title row */}
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br text-white shadow-md',
              config.accentColor
            )}
          >
            <Icon className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-foreground">{config.name}</h3>
            <p className="text-sm text-muted-foreground">{config.subtitle}</p>
            <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              <Smartphone className="w-3 h-3" />
              {config.audience}
            </span>
          </div>

          {/* Status badge */}
          <div
            className={cn(
              'shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full',
              hasLink
                ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                : 'bg-muted text-muted-foreground border border-border'
            )}
          >
            {hasLink ? '✓ Link Set' : 'No Link'}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">{config.description}</p>

        {/* Features */}
        <div className="flex flex-wrap gap-2">
          {config.features.map((f) => (
            <span
              key={f}
              className="text-[11px] px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/60 font-medium"
            >
              {f}
            </span>
          ))}
        </div>

        {/* Link section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Link2 className="w-4 h-4 text-primary" />
            Google Drive Download Link
          </div>

          {editing ? (
            <div className="space-y-2">
              <input
                type="url"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') handleCancel();
                }}
                placeholder="https://drive.google.com/file/d/..."
                className="input-field text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="btn-primary h-8 px-3 text-xs gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="btn-secondary h-8 px-3 text-xs gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {hasLink ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 border border-border group/link">
                  <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-xs text-foreground font-mono truncate">{link}</span>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/20 border border-dashed border-border text-muted-foreground text-xs">
                  <Info className="w-4 h-4 shrink-0" />
                  No Google Drive link set yet. Click Edit to add one.
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setDraft(link);
                    setEditing(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg transition-all duration-200 bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {hasLink ? 'Edit Link' : 'Set Link'}
                </button>
                <CopyButton text={link} />
                <ShareButton url={link} appName={config.name} />
                {hasLink && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg transition-all duration-200 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download APK
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Installation Guide ───────────────────────────────────────────────────────

function InstallGuide() {
  const steps = [
    {
      step: '1',
      title: 'Share the link',
      description: 'Copy or share the Google Drive download link with the agent.',
    },
    {
      step: '2',
      title: 'Enable Unknown Sources',
      description: 'On the Android device, go to Settings → Security → allow apps from Unknown Sources.',
    },
    {
      step: '3',
      title: 'Open the link',
      description: 'Open the Drive link in a browser on the Android device and tap "Download".',
    },
    {
      step: '4',
      title: 'Install the APK',
      description: 'Once downloaded, open the .apk file from the notifications or file manager and tap Install.',
    },
    {
      step: '5',
      title: 'Login & Register Device',
      description: 'Open the app, log in with company credentials, and register the device ID in Settings.',
    },
  ];

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <div className="flex items-center gap-2">
        <QrCode className="w-5 h-5 text-primary" />
        <h3 className="text-base font-semibold text-foreground">Installation Guide</h3>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium ml-auto">
          Android APK
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Share these steps with field staff along with the download link.
      </p>
      <ol className="space-y-3">
        {steps.map(({ step, title, description }) => (
          <li key={step} className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              {step}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Version Info Card ────────────────────────────────────────────────────────

function VersionCard({ links }: { links: AppLinks }) {
  const items = [
    { label: 'Sales App', hasLink: Boolean(links.sales) },
    { label: 'Delivery App', hasLink: Boolean(links.delivery) },
  ];

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <div className="flex items-center gap-2">
        <RefreshCw className="w-5 h-5 text-primary" />
        <h3 className="text-base font-semibold text-foreground">Distribution Status</h3>
      </div>
      <div className="space-y-3">
        {items.map(({ label, hasLink }) => (
          <div key={label} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{label}</span>
            </div>
            <div
              className={cn(
                'flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full',
                hasLink
                  ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                  : 'bg-muted text-muted-foreground border border-border'
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', hasLink ? 'bg-green-500' : 'bg-muted-foreground')} />
              {hasLink ? 'Ready to distribute' : 'Link not configured'}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Upload the latest APKs to Google Drive and paste the shareable links above. Always use the
        &quot;Anyone with the link can download&quot; permission on Drive.
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MobileApps() {
  const [links, setLinks] = useState<AppLinks>(loadLinks);

  useEffect(() => {
    saveLinks(links);
  }, [links]);

  const handleLinkChange = (id: AppConfig['id'], value: string) => {
    setLinks((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Mobile Apps</h2>
          <p className="text-muted-foreground mt-0.5">
            Manage Google Drive download links for the Flutter mobile applications
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 border border-border rounded-lg px-3 py-2">
          <Smartphone className="w-4 h-4 text-primary" />
          <span>Android APK Distribution</span>
        </div>
      </div>

      {/* App cards grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {APP_CONFIGS.map((cfg) => (
          <AppCard
            key={cfg.id}
            config={cfg}
            link={links[cfg.id]}
            onLinkChange={handleLinkChange}
          />
        ))}
      </div>

      {/* Bottom cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VersionCard links={links} />
        <InstallGuide />
      </div>
    </div>
  );
}

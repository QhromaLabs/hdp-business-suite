import { useMemo } from 'react';
import { getClientDeviceId } from '@/lib/device';
import { Copy, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

export default function DeviceId() {
  const deviceId = useMemo(() => getClientDeviceId(), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(deviceId);
      toast.success('Device ID copied');
    } catch (e) {
      toast.error('Could not copy device ID');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-xl w-full bg-card border border-border rounded-2xl shadow-lg p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground font-bold tracking-[0.2em]">Secure Access</p>
            <h1 className="text-xl font-bold text-foreground">Your Device ID</h1>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Share this ID with your administrator so they can authorize this device. This ID is generated locally in your browser/phone.
        </p>

        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground mb-1">Device ID</p>
          <div className="font-mono text-sm break-all text-foreground">{deviceId}</div>
          <button
            onClick={copy}
            className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
          >
            <Copy className="w-3.5 h-3.5" /> Copy
          </button>
        </div>

        <div className="text-xs text-muted-foreground space-y-2">
          <p><span className="font-semibold text-foreground">PC/Laptop:</span> Open this page on the machine you will use, copy the ID above, and send it to your admin.</p>
          <p><span className="font-semibold text-foreground">Mobile:</span> Open this page on the phone browser, copy the ID above, and send it to your admin.</p>
          <p><span className="font-semibold text-foreground">Privacy:</span> This ID is unique to this device/browser and stays the same for future visits.</p>
        </div>
      </div>
    </div>
  );
}

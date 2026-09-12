import { useState, useEffect } from 'react';
import { Copy, ShieldCheck, Globe } from 'lucide-react';
import { toast } from 'sonner';

export default function MyIp() {
    const [ip, setIp] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('https://api.ipify.org?format=json')
            .then((res) => res.json())
            .then((data) => {
                setIp(data.ip);
                setLoading(false);
            })
            .catch((err) => {
                console.error('Failed to fetch IP', err);
                setLoading(false);
            });
    }, []);

    const copyIp = async () => {
        if (ip) {
            await navigator.clipboard.writeText(ip);
            toast.success('IP Address copied to clipboard');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-lg p-8 space-y-6 text-center">

                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                    <Globe className="w-8 h-8" />
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-foreground">Your IP Address</h1>
                    <p className="text-muted-foreground mt-2">
                        Share this address with your administrator to request access to the system.
                    </p>
                </div>

                <div className="p-6 rounded-xl bg-muted/50 border border-border">
                    {loading ? (
                        <div className="animate-pulse h-8 w-32 bg-muted-foreground/20 rounded mx-auto" />
                    ) : (
                        <div className="font-mono text-3xl font-bold tracking-tight text-foreground">
                            {ip || 'Unknown'}
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider font-semibold">
                        Current Public IP
                    </p>
                </div>

                <button
                    onClick={copyIp}
                    disabled={!ip}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base"
                >
                    <Copy className="w-5 h-5" />
                    Copy IP Address
                </button>

                <div className="pt-6 border-t border-border">
                    <div className="flex items-start gap-3 text-left p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                        <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">Security Note:</span> This IP is unique to your network connection. If you switch networks (e.g., from WiFi to Mobile Data), your IP will change and you may lose access.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

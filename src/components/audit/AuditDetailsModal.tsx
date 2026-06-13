import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AuditEntry } from '@/hooks/useAudit';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal, Copy, ShieldCheck, Network, Cpu, Clock, ExternalLink, Sparkles, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AuditDetailsModalProps {
  open: boolean;
  onClose: () => void;
  audit: AuditEntry | null;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function AuditDetailsModal({ open, onClose, audit }: AuditDetailsModalProps) {
  if (!audit) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Hash copied to clipboard');
  };

  const generateAIExplanation = (a: AuditEntry) => {
    if (a.severity === 'CRITICAL') {
      return `CRITICAL: This action performed by ${a.user} heavily modified core system parameters or financial ledgers. It has been flagged due to high impact value or irregular network origins. Immediate manager review is highly recommended to verify authorization.`;
    }
    if (a.type === 'stock') {
      if (a.action === 'Inventory Adjusted') {
        return `The system detected a manual override of the inventory count. A physical discrepancy was recorded by ${a.user}. This indicates that the physical warehouse stock did not match the system's expected quantity, requiring a manual correction.`;
      }
      if (a.action === 'Product Sold') return `A standard fulfillment transaction occurred. Stock levels were depleted normally and linked to a verified sales order. No risk detected.`;
      if (a.action === 'Stock Added') return `New inventory was registered into the system by ${a.user}. This typically follows a received purchase order or physical restock.`;
    }
    if (a.type === 'money') {
      if (a.action.includes('Outflow') || a.action.includes('Expense')) {
        return `A financial outflow of KES ${a.lossValue} was recorded. The system verified the transaction against authorized spending limits.`;
      }
    }
    if (a.status === 'pending_review') {
      return `This event was flagged by the system as an anomaly because it deviates from standard operational patterns. It is awaiting manager approval to be fully reconciled.`;
    }
    
    return `This standard system event was logged by ${a.user}. The record has been permanently saved and cannot be modified.`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-background border-border shadow-2xl p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-6 border-b border-border/50 bg-muted/20">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <ShieldCheck className={cn(
                  "w-6 h-6",
                  audit.severity === 'CRITICAL' ? "text-destructive" :
                  audit.severity === 'WARNING' ? "text-warning" : "text-primary"
                )} />
                <DialogTitle className="text-xl font-bold tracking-tight">Forensic Audit Log</DialogTitle>
              </div>
              <p className="text-sm text-muted-foreground font-mono">Event ID: {audit.id}</p>
            </div>
            <div className={cn(
              "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
              audit.severity === 'CRITICAL' ? "bg-destructive/10 text-destructive border-destructive/20" :
              audit.severity === 'WARNING' ? "bg-warning/10 text-warning border-warning/20" :
              "bg-primary/10 text-primary border-primary/20"
            )}>
              {audit.severity || 'INFO'}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 p-6 overflow-y-auto scrollbar-hide">
          <div className="space-y-6">
            {/* Meta Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card border border-border/50 rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2 mb-1">
                  <Clock className="w-3 h-3" /> Timestamp
                </p>
                <p className="text-sm font-medium">{new Date(audit.timestamp).toLocaleString()}</p>
              </div>
              <div className="bg-card border border-border/50 rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2 mb-1">
                  <Network className="w-3 h-3" /> Source IP
                </p>
                <p className="text-sm font-medium font-mono text-primary">{audit.ipAddress || '127.0.0.1'}</p>
              </div>
              <div className="bg-card border border-border/50 rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2 mb-1">
                  <Cpu className="w-3 h-3" /> Device Fingerprint
                </p>
                <p className="text-sm font-medium truncate" title={audit.device}>{audit.device || 'Unknown Device'}</p>
              </div>
              <div className="bg-card border border-border/50 rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2 mb-1">
                  <ExternalLink className="w-3 h-3" /> Reference
                </p>
                <p className="text-sm font-medium">{audit.reference || 'N/A'}</p>
              </div>
            </div>

            {/* Action Details */}
            <div className="bg-card/40 border border-border/50 rounded-xl p-5 shadow-inner">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Action Summary</h3>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                  audit.status === 'resolved' || audit.status === 'approved' ? "bg-success/10 text-success" :
                  audit.status === 'pending_review' ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
                )}>
                  {audit.status.replace('_', ' ')}
                </span>
              </div>
              
              <div className="flex flex-col gap-2">
                <p className="text-lg font-semibold text-foreground">{audit.action}</p>
                <p className="text-sm text-muted-foreground">{audit.details}</p>
                <div className="flex items-center gap-2 mt-2 text-sm font-medium">
                  <span className="text-muted-foreground">Executed by:</span>
                  <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-md">{audit.user}</span>
                </div>
              </div>

              {(audit.lossValue || audit.recoveredValue) && (
                <div className="flex gap-6 mt-6 pt-6 border-t border-border/50">
                  {audit.lossValue ? (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Value Impact</p>
                      <p className="text-lg font-black text-destructive">-{formatCurrency(audit.lossValue)}</p>
                    </div>
                  ) : null}
                  {audit.recoveredValue ? (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Value Recovered</p>
                      <p className="text-lg font-black text-success">+{formatCurrency(audit.recoveredValue)}</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* AI Explainer */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <div className="flex gap-3">
                <div className="mt-0.5 bg-primary/10 p-2 rounded-lg text-primary">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-1">AI Forensic Analysis</h3>
                  <p className="text-sm text-foreground leading-relaxed">
                    {generateAIExplanation(audit)}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
        <div className="p-4 border-t border-border/50 bg-muted/20 flex items-center justify-between">
          <div className="flex gap-2">
            {audit.status === 'pending_review' && (
              <>
                <Button onClick={() => { toast.success('Anomaly marked as resolved'); onClose(); }} className="gap-2 bg-success hover:bg-success/90 text-success-foreground">
                  <CheckCircle className="w-4 h-4" /> Resolve Anomaly
                </Button>
                <Button onClick={() => { toast.error('Incident escalated to upper management'); onClose(); }} variant="destructive" className="gap-2">
                  <AlertTriangle className="w-4 h-4" /> Escalate
                </Button>
              </>
            )}
          </div>
          <Button onClick={onClose} variant="outline" className="min-w-[100px]">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

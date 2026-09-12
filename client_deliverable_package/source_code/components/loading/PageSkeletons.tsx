import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageHeaderSkeleton({ actions = 2 }: { actions?: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 bg-muted/70" />
        <Skeleton className="h-4 w-64 bg-muted/50" />
      </div>
      <div className="flex gap-3">
        {Array.from({ length: actions }).map((_, idx) => (
          <Skeleton
            key={idx}
            className="h-10 w-28 rounded-lg bg-gradient-to-r from-muted/70 to-muted/40"
          />
        ))}
      </div>
    </div>
  );
}

export function StatsSkeleton({ items = 4 }: { items?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: items }).map((_, idx) => (
        <div
          key={idx}
          className="stat-card bg-card/60 border border-border/60 animate-slide-up"
          style={{ animationDelay: `${idx * 40}ms` }}
        >
          <div className="flex items-start justify-between">
            <Skeleton className="h-10 w-10 rounded-xl bg-muted/60" />
            <Skeleton className="h-4 w-16 rounded-full bg-muted/60" />
          </div>
          <div className="mt-6 space-y-2">
            <Skeleton className="h-6 w-32 bg-muted/70" />
            <Skeleton className="h-4 w-24 bg-muted/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FilterBarSkeleton({ pills = 3 }: { pills?: number }) {
  return (
    <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
      <div className="flex flex-1 gap-3 flex-wrap">
        <Skeleton className="h-11 w-64 rounded-xl bg-muted/50" />
        <Skeleton className="h-11 w-32 rounded-xl bg-muted/40" />
        <div className="flex gap-2">
          {Array.from({ length: pills }).map((_, idx) => (
            <Skeleton key={idx} className="h-11 w-24 rounded-xl bg-muted/40" />
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-11 w-28 rounded-lg bg-muted/50" />
        <Skeleton className="h-11 w-28 rounded-lg bg-muted/50" />
        <Skeleton className="h-11 w-32 rounded-lg bg-muted/60" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 7 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="grid grid-cols-1 gap-0">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className={cn(
              "grid items-center px-6 py-3",
              `grid-cols-[32px_repeat(${columns},minmax(0,1fr))]`,
              "border-b border-border/70 bg-card/40"
            )}
          >
            <Skeleton className="h-5 w-5 rounded bg-muted/60" />
            {Array.from({ length: columns }).map((__, colIdx) => (
              <Skeleton
                key={colIdx}
                className="h-4 w-full max-w-[160px] bg-muted/50 rounded"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: cards }).map((_, idx) => (
        <div
          key={idx}
          className="bg-card border border-border rounded-xl p-5 shadow-sm animate-slide-up"
          style={{ animationDelay: `${idx * 40}ms` }}
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl bg-muted/60" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32 bg-muted/70" />
              <Skeleton className="h-3 w-48 bg-muted/50" />
              <Skeleton className="h-3 w-24 bg-muted/40" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FormCardSkeleton({ fields = 4, actionButtons = 2 }: { fields?: number; actionButtons?: number }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
      <Skeleton className="h-5 w-40 bg-muted/70" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: fields }).map((_, idx) => (
          <div key={idx} className="space-y-2">
            <Skeleton className="h-3 w-24 bg-muted/50" />
            <Skeleton className="h-11 w-full rounded-lg bg-muted/40" />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-3">
        {Array.from({ length: actionButtons }).map((_, idx) => (
          <Skeleton key={idx} className="h-10 w-28 rounded-lg bg-muted/60" />
        ))}
      </div>
    </div>
  );
}

export function AuthSkeleton() {
  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 space-y-6 shadow-xl animate-fade-in">
        <div className="space-y-3 text-center">
          <Skeleton className="h-8 w-40 mx-auto bg-muted/60" />
          <Skeleton className="h-4 w-64 mx-auto bg-muted/40" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="space-y-2">
              <Skeleton className="h-3 w-24 bg-muted/50" />
              <Skeleton className="h-11 w-full rounded-lg bg-muted/40" />
            </div>
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-lg bg-muted/60" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28 bg-muted/50" />
          <Skeleton className="h-4 w-24 bg-muted/50" />
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-sidebar via-sidebar to-sidebar/90 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <Skeleton className="h-6 w-40 bg-white/30" />
            <Skeleton className="h-4 w-72 bg-white/20" />
          </div>
          <Skeleton className="h-10 w-32 rounded-lg bg-white/20" />
        </div>
      </div>

      <StatsSkeleton />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40 bg-muted/60" />
            <Skeleton className="h-5 w-20 rounded-full bg-muted/50" />
          </div>
          <Skeleton className="h-[260px] w-full rounded-xl bg-muted/30" />
        </div>
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-4">
          <Skeleton className="h-5 w-32 bg-muted/60" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full bg-muted/60" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32 bg-muted/70" />
                  <Skeleton className="h-3 w-24 bg-muted/50" />
                </div>
                <Skeleton className="h-4 w-12 bg-muted/50" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function POSSkeleton() {
  return (
    <div className="h-[calc(100vh-7rem)] flex gap-6 animate-fade-in">
      <div className="flex-1 flex flex-col min-w-0 space-y-5">
        <div className="flex gap-4">
          <Skeleton className="h-12 flex-1 rounded-xl bg-muted/50" />
          <Skeleton className="h-12 w-56 rounded-xl bg-muted/50" />
        </div>
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton
              key={idx}
              className="h-10 w-24 rounded-full bg-muted/40"
              style={{ animationDelay: `${idx * 30}ms` }}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 pr-2 overflow-y-auto">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="aspect-[4/3] rounded-2xl bg-muted/30 border border-border/60 shadow-sm p-4 flex flex-col justify-between animate-slide-up"
              style={{ animationDelay: `${(idx % 6) * 40}ms` }}
            >
              <Skeleton className="h-28 w-full rounded-xl bg-muted/50" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40 bg-muted/70" />
                <Skeleton className="h-3 w-24 bg-muted/50" />
              </div>
              <Skeleton className="h-5 w-28 bg-muted/60" />
            </div>
          ))}
        </div>
      </div>

      <div className="w-[400px] pos-cart-container space-y-0">
        <div className="p-5 border-b border-border/50 bg-accent/20 space-y-3">
          <Skeleton className="h-5 w-32 bg-muted/60" />
          <Skeleton className="h-4 w-24 bg-muted/50" />
          <Skeleton className="h-10 w-full rounded-xl bg-muted/40" />
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-card/30">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
              <Skeleton className="h-4 w-48 bg-muted/70" />
              <Skeleton className="h-4 w-24 bg-muted/50" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-9 w-28 rounded-lg bg-muted/40" />
                <Skeleton className="h-5 w-20 bg-muted/60" />
              </div>
            </div>
          ))}
        </div>
        <div className="p-6 border-t border-border/50 space-y-3 bg-accent/10">
          <Skeleton className="h-4 w-full bg-muted/50" />
          <Skeleton className="h-4 w-5/6 bg-muted/50" />
          <Skeleton className="h-10 w-full rounded-xl bg-muted/60" />
        </div>
      </div>
    </div>
  );
}

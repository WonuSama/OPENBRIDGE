import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function NavButton({ active, icon: Icon, label, onClick, compact = false }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex min-h-10 w-full items-center border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#191b20]",
        compact ? "justify-center rounded-[10px] px-0" : "gap-3 rounded-[10px] px-3.5",
        active
          ? "border-white/14 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
          : "border-transparent text-white/72 hover:border-white/8 hover:bg-white/5 hover:text-white"
      )}
      title={label}
    >
      <Icon sx={{ fontSize: 18 }} className={active ? "text-white" : "text-white/55"} />
      {!compact ? <span>{label}</span> : null}
    </button>
  );
}

export function ScopeToggle({ active, label, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-start justify-between rounded-md border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f7f8]",
        active ? "border-neutral-900 bg-white text-neutral-950" : "border-transparent bg-transparent text-neutral-600 hover:border-neutral-200 hover:bg-white/60"
      )}
    >
      <span className="space-y-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-neutral-500">{description}</span>
      </span>
      <span className={cn("mt-1 h-2.5 w-2.5 rounded-full", active ? "bg-emerald-500" : "bg-neutral-300")} />
    </button>
  );
}

export function MetricCard({ icon: Icon, label, value, detail }) {
  return (
    <Card className="gap-3">
      <CardHeader className="px-4 pb-0">
        <div className="flex items-center justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-neutral-700">
            <Icon className="h-4 w-4" sx={{ fontSize: 16 }} />
          </div>
          <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-400">{label}</span>
        </div>
      </CardHeader>
      <CardContent className="px-4">
        <div className="text-2xl font-semibold tracking-tight text-neutral-950">{value}</div>
        <p className="mt-1 text-sm text-neutral-500">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function EmptyState({ title, detail }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-6 text-center">
      <p className="text-sm font-medium text-neutral-800">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-neutral-500">{detail}</p>
    </div>
  );
}

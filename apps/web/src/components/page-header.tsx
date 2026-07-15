import { RefreshCw } from 'lucide-react';

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

// Manual refresh — the dashboard doesn't auto-poll (keeps API/DB usage low on
// free hosting). Click to refetch; the icon spins while a fetch is in flight.
export function RefreshButton({
  onClick,
  spinning,
}: {
  onClick?: () => void;
  spinning?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={spinning}
      title="Refresh"
      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-60"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${spinning ? 'animate-spin' : ''}`} />
      Refresh
    </button>
  );
}

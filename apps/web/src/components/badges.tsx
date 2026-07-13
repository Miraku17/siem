import type { Severity } from '@/lib/types';
import { appColor } from '@/lib/format';
import { cn } from '@/lib/utils';

const SEVERITY_STYLES: Record<Severity, string> = {
  LOW: 'bg-severity-low/15 text-severity-low ring-severity-low/25',
  MEDIUM: 'bg-severity-medium/15 text-severity-medium ring-severity-medium/25',
  HIGH: 'bg-severity-high/15 text-severity-high ring-severity-high/25',
  CRITICAL:
    'bg-severity-critical/15 text-severity-critical ring-severity-critical/25',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset',
        SEVERITY_STYLES[severity] ?? 'bg-muted text-muted-foreground',
      )}
    >
      {severity}
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-severity-high/15 text-severity-high',
  ACKNOWLEDGED: 'bg-severity-medium/15 text-severity-medium',
  INVESTIGATING: 'bg-primary/15 text-primary',
  CONTAINED: 'bg-primary/15 text-primary',
  RESOLVED: 'bg-emerald-500/15 text-emerald-400',
  CLOSED: 'bg-muted text-muted-foreground',
  FALSE_POSITIVE: 'bg-muted text-muted-foreground',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide',
        STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground',
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// Colored pill identifying the source application (deterministic hue per slug).
export function ApplicationBadge({
  name,
  slug,
}: {
  name: string;
  slug: string;
}) {
  const c = appColor(slug);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: c.bg, color: c.fg }}
      title={slug}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: c.dot }}
      />
      {name}
    </span>
  );
}

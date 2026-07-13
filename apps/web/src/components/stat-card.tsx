import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  tone?: 'default' | 'primary' | 'warning' | 'critical';
}) {
  const toneStyles = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/15 text-primary',
    warning: 'bg-severity-medium/15 text-severity-medium',
    critical: 'bg-severity-critical/15 text-severity-critical',
  }[tone];

  return (
    <Card>
      <CardContent className="flex items-start justify-between p-4">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">
            {value}
          </div>
          {hint && (
            <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-md',
              toneStyles,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

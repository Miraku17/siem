import { AlertCircle } from 'lucide-react';
import type { Overview } from '@/lib/types';
import { cn } from '@/lib/utils';

function Pill({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-1 text-xs font-medium text-white/90">
      <AlertCircle className="h-3.5 w-3.5" />
      {text}
    </span>
  );
}

function Tile({
  label,
  value,
  pill,
  className,
  muted,
  loading,
}: {
  label: string;
  value: number;
  pill?: string;
  className: string;
  muted?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col justify-between gap-4 rounded-xl border p-4',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <span
          className={cn(
            'text-sm font-medium',
            muted ? 'text-muted-foreground' : 'text-white/90',
          )}
        >
          {label}
        </span>
        {pill && value > 0 && <Pill text={pill} />}
      </div>
      <div
        className={cn(
          'text-3xl font-semibold tabular-nums',
          muted ? 'text-foreground' : 'text-white',
        )}
      >
        {loading ? '—' : value.toLocaleString()}
      </div>
    </div>
  );
}

export function SeverityCards({
  alerts,
  loading,
}: {
  alerts?: Overview['alerts'];
  loading?: boolean;
}) {
  const a = alerts;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Tile
        label="Total alerts"
        value={a?.total ?? 0}
        muted
        loading={loading}
        className="border-border bg-card"
      />
      <Tile
        label="Critical alerts"
        value={a?.critical ?? 0}
        pill={`${a?.criticalOpen ?? 0} need immediate action`}
        loading={loading}
        className="border-red-950 bg-gradient-to-br from-red-950 to-[#2a0a0b]"
      />
      <Tile
        label="High alerts"
        value={a?.high ?? 0}
        pill={`${a?.highOpen ?? 0} need immediate action`}
        loading={loading}
        className="border-red-800 bg-gradient-to-br from-red-700 to-red-800"
      />
      <Tile
        label="Medium alerts"
        value={a?.medium ?? 0}
        pill={`${a?.mediumOpen ?? 0} need review`}
        loading={loading}
        className="border-amber-700 bg-gradient-to-br from-amber-600 to-orange-700"
      />
    </div>
  );
}

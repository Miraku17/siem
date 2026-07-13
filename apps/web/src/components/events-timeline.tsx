'use client';

import type { TimelinePoint } from '@/lib/types';

// Single-series hourly event volume for the last 24h. One hue (primary),
// thin bars with rounded data-ends anchored to a recessive baseline, and a
// per-bar hover tooltip — no legend (the title names the series).
export function EventsTimeline({ data }: { data: TimelinePoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div>
      <div className="flex h-40 items-end gap-[3px]">
        {data.map((d) => {
          const pct = (d.count / max) * 100;
          const t = new Date(d.hour);
          const label = t.toLocaleTimeString([], {
            hour: 'numeric',
            hour12: true,
          });
          return (
            <div
              key={d.hour}
              className="group relative flex h-full flex-1 items-end"
            >
              {/* hover column highlight */}
              <div className="absolute inset-0 rounded-sm bg-accent opacity-0 transition-opacity group-hover:opacity-40" />
              <div
                className="relative w-full rounded-t-[3px] bg-primary/80 transition-colors group-hover:bg-primary"
                style={{ height: `max(${pct}%, ${d.count > 0 ? 4 : 2}px)` }}
              />
              {/* tooltip */}
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md group-hover:block">
                <div className="font-medium">{d.count} events</div>
                <div className="text-muted-foreground">{label}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
        <span>24h ago</span>
        <span>12h ago</span>
        <span>now</span>
      </div>
    </div>
  );
}

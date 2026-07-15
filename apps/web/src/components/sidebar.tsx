'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  AppWindow,
  ShieldAlert,
  Siren,
  ScrollText,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { api, logout } from '@/lib/api';
import type { Overview } from '@/lib/types';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: 'alerts';
};

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Monitoring',
    items: [
      { href: '/', label: 'Overview', icon: LayoutDashboard },
      { href: '/events', label: 'Events', icon: ScrollText },
    ],
  },
  {
    label: 'Detection',
    items: [
      { href: '/alerts', label: 'Alerts', icon: ShieldAlert, badge: 'alerts' },
      { href: '/incidents', label: 'Incidents', icon: Siren },
    ],
  },
  {
    label: 'Manage',
    items: [{ href: '/applications', label: 'Applications', icon: AppWindow }],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data } = useQuery({
    queryKey: ['overview'],
    queryFn: () => api<Overview>('/overview'),
    refetchInterval: 15_000,
  });

  const openTotal =
    (data?.alerts.criticalOpen ?? 0) +
    (data?.alerts.highOpen ?? 0) +
    (data?.alerts.mediumOpen ?? 0);
  const hasCritical = (data?.alerts.criticalOpen ?? 0) > 0;

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card">
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-inset ring-primary/20">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold leading-tight tracking-tight">
            SIEM Platform
          </div>
          <div className="text-[11px] text-muted-foreground">
            Security Operations
          </div>
        </div>
      </div>

      {/* System status */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Operational
        </div>
        {data && (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {data.totals.events24h.toLocaleString()} ev/24h
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="px-2 pb-1.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                      active
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
                    )}
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge === 'alerts' && openTotal > 0 && (
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                          hasCritical
                            ? 'bg-severity-critical/20 text-severity-critical'
                            : 'bg-severity-medium/20 text-severity-medium',
                        )}
                      >
                        {openTotal}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
            AD
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">admin@siem.local</div>
            <div className="text-[11px] text-muted-foreground">Administrator</div>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

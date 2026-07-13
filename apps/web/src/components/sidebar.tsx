'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  AppWindow,
  ShieldAlert,
  Siren,
  ScrollText,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { logout } from '@/lib/api';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/applications', label: 'Applications', icon: AppWindow },
  { href: '/alerts', label: 'Alerts', icon: ShieldAlert },
  { href: '/incidents', label: 'Incidents', icon: Siren },
  { href: '/events', label: 'Events', icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="text-[15px] font-semibold tracking-tight">
          SIEM<span className="text-primary"> · SOC</span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        <div className="px-2 pb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Monitoring
        </div>
        {NAV.map((item) => {
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
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
            AD
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">admin@siem.local</div>
            <div className="text-xs text-muted-foreground">Administrator</div>
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

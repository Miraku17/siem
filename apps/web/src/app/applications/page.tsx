'use client';

import { useQuery } from '@tanstack/react-query';
import { AppWindow } from 'lucide-react';
import { api } from '@/lib/api';
import type { Application } from '@/lib/types';
import { appColor } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function ApplicationsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['applications'],
    queryFn: () => api<Application[]>('/applications'),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Applications"
        description="Connected sources sending security telemetry to the SIEM."
      />

      {isError && (
        <p className="text-sm text-severity-critical">
          Failed to load applications.
        </p>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No applications registered.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((appItem) => (
            <AppCard key={appItem.id} app={appItem} />
          ))}
        </div>
      )}
    </div>
  );
}

function AppCard({ app }: { app: Application }) {
  const c = appColor(app.slug);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-md"
            style={{ backgroundColor: c.bg, color: c.fg }}
          >
            <AppWindow className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm">{app.name}</CardTitle>
            <div className="text-xs text-muted-foreground">{app.slug}</div>
          </div>
        </div>
        <Badge
          variant={app.status === 'ACTIVE' ? 'default' : 'outline'}
        >
          {app.status}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          API Key
        </div>
        {/* Only the prefix exists server-side — the key is hashed at rest and
            shown in full exactly once, when the application is registered. */}
        <div className="mt-1 flex w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5">
          <code className="truncate font-mono text-xs text-muted-foreground">
            {app.keyPrefix}…
          </code>
          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
            hashed
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

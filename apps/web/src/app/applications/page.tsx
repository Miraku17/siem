'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppWindow, Copy, Check } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);
  const c = appColor(app.slug);

  const copy = () => {
    navigator.clipboard.writeText(app.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

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
        <button
          onClick={copy}
          className="mt-1 flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-left transition-colors hover:bg-accent"
          title="Copy API key"
        >
          <code className="truncate font-mono text-xs text-muted-foreground">
            {app.apiKey}
          </code>
          {copied ? (
            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
        </button>
      </CardContent>
    </Card>
  );
}

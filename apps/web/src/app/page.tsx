'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Siren } from 'lucide-react';
import { api } from '@/lib/api';
import type { Overview } from '@/lib/types';
import { PageHeader, RefreshButton } from '@/components/page-header';
import { SeverityCards } from '@/components/severity-cards';
import { SeverityBadge } from '@/components/badges';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Charts are client-only (ECharts touches the DOM) — load without SSR.
const AlertTypesDonut = dynamic(
  () => import('@/components/charts/alert-types-donut').then((m) => m.AlertTypesDonut),
  { ssr: false, loading: () => <ChartSkeleton h={260} /> },
);
const LogSourcesArea = dynamic(
  () => import('@/components/charts/log-sources-area').then((m) => m.LogSourcesArea),
  { ssr: false, loading: () => <ChartSkeleton h={300} /> },
);
const GeoMap = dynamic(
  () => import('@/components/charts/geo-map').then((m) => m.GeoMap),
  { ssr: false, loading: () => <ChartSkeleton h={300} /> },
);

export default function OverviewPage() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['overview'],
    queryFn: () => api<Overview>('/overview'),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Overview"
        description="Security posture across all connected sources."
      >
        <RefreshButton spinning={isFetching} onClick={() => refetch()} />
      </PageHeader>

      <SeverityCards alerts={data?.alerts} loading={isLoading} />

      {/* Map + Alert types */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Alert Source Map" className="lg:col-span-2">
          {isLoading || !data ? (
            <ChartSkeleton h={300} />
          ) : (
            <GeoMap data={data.geo} />
          )}
        </Panel>
        <Panel title="Alert Types">
          {isLoading || !data ? (
            <ChartSkeleton h={260} />
          ) : (
            <AlertTypesDonut data={data.eventTypes} />
          )}
        </Panel>
      </div>

      {/* Event volume + Recent alerts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Event Volume by Source · Last 24h" className="lg:col-span-2">
          {isLoading || !data ? (
            <ChartSkeleton h={300} />
          ) : (
            <LogSourcesArea
              hours={data.logSources.hours}
              series={data.logSources.series}
            />
          )}
        </Panel>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm text-muted-foreground">
              Recent Alerts
            </CardTitle>
            <Link href="/alerts" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : data && data.recentAlerts.length > 0 ? (
              <ul className="space-y-1">
                {data.recentAlerts.map((al) => (
                  <li key={al.id}>
                    <Link
                      href={`/alerts/${al.id}`}
                      className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-accent"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <SeverityBadge severity={al.severity} />
                        <span className="truncate text-sm">{al.title}</span>
                      </div>
                      <Siren className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No alerts yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Panel({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ChartSkeleton({ h }: { h: number }) {
  return <Skeleton className="w-full" style={{ height: h }} />;
}

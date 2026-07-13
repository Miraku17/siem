'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { Alert } from '@/lib/types';
import { PageHeader, LiveIndicator } from '@/components/page-header';
import { SeverityBadge, StatusBadge } from '@/components/badges';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AlertsPage() {
  const router = useRouter();
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api<Alert[]>('/alerts'),
    refetchInterval: 10_000,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Alerts"
        description="Detections raised by the rule engine. Click a row to investigate."
      >
        <LiveIndicator active={isFetching} />
      </PageHeader>

      {isError && (
        <p className="text-sm text-severity-critical">Failed to load alerts.</p>
      )}

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Severity</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Rule</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <Empty text="Loading alerts…" />
            ) : !data || data.length === 0 ? (
              <Empty text="No alerts yet." />
            ) : (
              data.map((a) => (
                <TableRow
                  key={a.id}
                  onClick={() => router.push(`/alerts/${a.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <SeverityBadge severity={a.severity} />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{a.title}</div>
                    {a.description && (
                      <div className="text-xs text-muted-foreground">
                        {a.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {a.ruleId ?? '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={a.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={6}
        className="py-12 text-center text-muted-foreground"
      >
        {text}
      </TableCell>
    </TableRow>
  );
}

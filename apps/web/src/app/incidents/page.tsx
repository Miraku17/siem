'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Incident } from '@/lib/types';
import { PageHeader, RefreshButton } from '@/components/page-header';
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

export default function IncidentsPage() {
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => api<Incident[]>('/incidents'),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Incidents"
        description="Grouped investigations under active case management."
      >
        <RefreshButton spinning={isFetching} onClick={() => refetch()} />
      </PageHeader>

      {isError && (
        <p className="text-sm text-severity-critical">
          Failed to load incidents.
        </p>
      )}

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Priority</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <Empty text="Loading incidents…" />
            ) : !data || data.length === 0 ? (
              <Empty text="No incidents." />
            ) : (
              data.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>
                    <SeverityBadge severity={i.priority} />
                  </TableCell>
                  <TableCell className="font-medium">{i.title}</TableCell>
                  <TableCell>
                    <StatusBadge status={i.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(i.createdAt).toLocaleString()}
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
        colSpan={4}
        className="py-12 text-center text-muted-foreground"
      >
        {text}
      </TableCell>
    </TableRow>
  );
}

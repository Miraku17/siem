'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { api } from '@/lib/api';
import type { Alert, Severity } from '@/lib/types';
import { relativeTime } from '@/lib/format';
import { PageHeader, RefreshButton } from '@/components/page-header';
import { SeverityBadge, StatusBadge } from '@/components/badges';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const SEVERITIES: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const STATUSES = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_POSITIVE'];
const ALL = '__all__';
const PAGE_SIZE = 15;

const SEVERITY_ACCENT: Record<Severity, string> = {
  LOW: 'border-l-severity-low',
  MEDIUM: 'border-l-severity-medium',
  HIGH: 'border-l-severity-high',
  CRITICAL: 'border-l-severity-critical',
};

const DISPOSITION_LABEL: Record<string, string> = {
  BENIGN: 'Benign',
  FALSE_POSITIVE: 'False Positive',
  TRUE_POSITIVE_NO_IMPACT: 'TP · No Impact',
  TRUE_POSITIVE: 'True Positive',
};

export default function AlertsPage() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [severity, setSeverity] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api<Alert[]>('/alerts'),
  });

  const rows = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    return data.filter((a) => {
      if (severity !== ALL && a.severity !== severity) return false;
      if (status !== ALL && a.status !== status) return false;
      if (term) {
        const hay = [a.title, a.ruleId, a.description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [data, q, severity, status]);

  const openCount = data?.filter((a) => a.status === 'OPEN').length ?? 0;
  const hasFilters = q || severity !== ALL || status !== ALL;

  // Reset to the first page whenever the filtered result set changes.
  useEffect(() => {
    setPage(1);
  }, [q, severity, status]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = rows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Alerts"
        description="Detections raised by the rule engine. Click a row to triage."
      >
        <RefreshButton spinning={isFetching} onClick={() => refetch()} />
      </PageHeader>

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title or rule…"
            className="pl-9"
          />
        </div>
        <FilterSelect
          value={severity}
          onChange={setSeverity}
          placeholder="All severities"
          options={SEVERITIES.map((s) => ({ value: s, label: s }))}
        />
        <FilterSelect
          value={status}
          onChange={setStatus}
          placeholder="All statuses"
          options={STATUSES.map((s) => ({
            value: s,
            label: s.replace(/_/g, ' '),
          }))}
        />
        {hasFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setQ('');
              setSeverity(ALL);
              setStatus(ALL);
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {isLoading
            ? 'Loading…'
            : `Showing ${rows.length}${
                data && rows.length !== data.length ? ` of ${data.length}` : ''
              } alert${rows.length === 1 ? '' : 's'}`}
        </span>
        {!isLoading && openCount > 0 && (
          <span className="text-severity-high">{openCount} open</span>
        )}
      </div>

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
              <TableHead>Age</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <Empty text="Loading alerts…" />
            ) : rows.length === 0 ? (
              <Empty
                text={
                  hasFilters ? 'No alerts match these filters.' : 'No alerts yet.'
                }
              />
            ) : (
              pageRows.map((a) => (
                <TableRow
                  key={a.id}
                  onClick={() => router.push(`/alerts/${a.id}`)}
                  className={`cursor-pointer border-l-2 ${SEVERITY_ACCENT[a.severity]}`}
                >
                  <TableCell>
                    <SeverityBadge severity={a.severity} />
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="font-medium">{a.title}</div>
                    {a.description && (
                      <div className="truncate text-xs text-muted-foreground">
                        {a.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {a.ruleId ?? '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={a.status} />
                      {a.disposition && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {DISPOSITION_LABEL[a.disposition] ?? a.disposition}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell
                    className="whitespace-nowrap text-muted-foreground"
                    title={new Date(a.createdAt).toLocaleString()}
                  >
                    {relativeTime(a.createdAt)}
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

      {!isLoading && rows.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, rows.length)} of {rows.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Prev
            </Button>
            <span className="tabular-nums">
              Page {currentPage} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[170px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
        {text}
      </TableCell>
    </TableRow>
  );
}

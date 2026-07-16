'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api';
import type { SecurityEvent, Severity } from '@/lib/types';
import { relativeTime } from '@/lib/format';
import { PageHeader, RefreshButton } from '@/components/page-header';
import { SeverityBadge, ApplicationBadge } from '@/components/badges';
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

const SEVERITIES: Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const ALL = '__all__';

const SEVERITY_ACCENT: Record<Severity, string> = {
  LOW: 'border-l-severity-low',
  MEDIUM: 'border-l-severity-medium',
  HIGH: 'border-l-severity-high',
  CRITICAL: 'border-l-severity-critical',
};

export default function EventsPage() {
  const [q, setQ] = useState('');
  const [app, setApp] = useState(ALL);
  const [severity, setSeverity] = useState(ALL);
  const [eventType, setEventType] = useState(ALL);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['events'],
    queryFn: () => api<SecurityEvent[]>('/events'),
  });

  const apps = useMemo(() => {
    const map = new Map<string, string>();
    data?.forEach((e) => {
      if (e.application) map.set(e.application.slug, e.application.name);
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [data]);

  const eventTypes = useMemo(
    () => [...new Set(data?.map((e) => e.eventType) ?? [])].sort(),
    [data],
  );

  const rows = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    return data.filter((e) => {
      if (app !== ALL && e.application?.slug !== app) return false;
      if (severity !== ALL && e.severity !== severity) return false;
      if (eventType !== ALL && e.eventType !== eventType) return false;
      if (term) {
        const hay = [e.eventType, e.email, e.userId, e.ipAddress, e.application?.name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [data, q, app, severity, eventType]);

  const hasFilters = q || app !== ALL || severity !== ALL || eventType !== ALL;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Events"
        description="Security event stream across all sources."
      >
        <RefreshButton spinning={isFetching} onClick={() => refetch()} />
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search event, email, IP…"
            className="pl-9"
          />
        </div>
        <FilterSelect
          value={app}
          onChange={setApp}
          placeholder="All applications"
          options={apps.map(([slug, name]) => ({ value: slug, label: name }))}
        />
        <FilterSelect
          value={severity}
          onChange={setSeverity}
          placeholder="All severities"
          options={SEVERITIES.map((s) => ({ value: s, label: s }))}
        />
        <FilterSelect
          value={eventType}
          onChange={setEventType}
          placeholder="All events"
          options={eventTypes.map((t) => ({ value: t, label: t }))}
        />
        {hasFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setQ('');
              setApp(ALL);
              setSeverity(ALL);
              setEventType(ALL);
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        {isLoading
          ? 'Loading…'
          : `${rows.length}${
              data && rows.length !== data.length ? ` of ${data.length}` : ''
            } event${rows.length === 1 ? '' : 's'}`}
      </div>

      {isError && (
        <p className="text-sm text-severity-critical">Failed to load events.</p>
      )}

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Outcome</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <Empty text="Loading events…" />
            ) : rows.length === 0 ? (
              <Empty
                text={
                  hasFilters
                    ? 'No events match these filters.'
                    : 'No events yet. Connect a source to start streaming.'
                }
              />
            ) : (
              rows.map((e) => <Row key={e.id} e={e} />)
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function Row({ e }: { e: SecurityEvent }) {
  const meta = (e.metadata ?? {}) as Record<string, any>;
  const place = [meta.city, meta.country].filter(Boolean).join(', ');
  return (
    <TableRow className={`border-l-2 ${SEVERITY_ACCENT[e.severity]}`}>
      <TableCell
        className="whitespace-nowrap text-muted-foreground"
        title={new Date(e.timestamp).toLocaleString()}
      >
        {relativeTime(e.timestamp)}
      </TableCell>
      <TableCell>
        <SeverityBadge severity={e.severity} />
      </TableCell>
      <TableCell>
        <div className="font-medium">{e.eventType}</div>
        {e.application && (
          <div className="mt-1">
            <ApplicationBadge
              name={e.application.name}
              slug={e.application.slug}
            />
          </div>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {e.email ?? e.userId ?? '—'}
      </TableCell>
      <TableCell>
        {e.ipAddress ? (
          <>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              {e.ipAddress}
              <ThreatBadge metadata={e.metadata} />
            </div>
            {place && (
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {place}
              </div>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <EventStatus event={e.eventType} code={e.statusCode} />
      </TableCell>
    </TableRow>
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

const FAILURE_EVENT = /(FAILED|DENIED|INVALID|LOCKED|SUSPICIOUS|ERROR|RATE_LIMIT|BLOCKED)/;

// Meaningful outcome for every event: HTTP code when present, else a
// Failed/OK derived from the event type (non-HTTP events have no code).
function EventStatus({ event, code }: { event: string; code: number | null }) {
  if (code != null) {
    const color =
      code >= 500
        ? 'text-severity-critical'
        : code >= 400
          ? 'text-severity-medium'
          : 'text-emerald-400';
    return <span className={`font-mono text-xs ${color}`}>{code}</span>;
  }
  const failed = FAILURE_EVENT.test(event.toUpperCase());
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        failed
          ? 'bg-severity-medium/15 text-severity-medium'
          : 'bg-emerald-500/15 text-emerald-400'
      }`}
    >
      {failed ? 'Failed' : 'OK'}
    </span>
  );
}

// IP reputation badge from threat-intel enrichment; only shown when flagged.
function ThreatBadge({ metadata }: { metadata?: Record<string, unknown> | null }) {
  const threat = (metadata as any)?.threat as
    | { score?: number; listed?: boolean }
    | undefined;
  if (!threat) return null;
  const score = threat.score ?? 0;
  if (!threat.listed && score < 1) return null;

  const tone =
    score >= 80 || threat.listed
      ? 'bg-severity-critical/15 text-severity-critical'
      : score >= 25
        ? 'bg-severity-high/15 text-severity-high'
        : 'bg-severity-medium/15 text-severity-medium';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${tone}`}
      title={`Threat score ${score}/100${threat.listed ? ' · blocklisted' : ''}`}
    >
      <ShieldAlert className="h-3 w-3" />
      {score}
    </span>
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

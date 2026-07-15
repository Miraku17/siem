'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  Clock,
  Users,
  Monitor,
  AppWindow,
  Lightbulb,
  Target,
  MapPin,
  KeyRound,
  Network,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  MessageSquare,
  Search,
  ClipboardCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { AlertDetail, AlertDisposition, Severity } from '@/lib/types';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/badges';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const HIGH_RISK_COUNTRIES = ['Russia', 'North Korea', 'Iran', 'Nigeria'];

const RISK: Record<Severity, { label: string; conf: string; className: string }> = {
  CRITICAL: { label: 'Critical Risk', conf: 'High confidence', className: 'text-severity-critical' },
  HIGH: { label: 'High Risk', conf: 'High confidence', className: 'text-severity-high' },
  MEDIUM: { label: 'Medium Risk', conf: 'Medium confidence', className: 'text-severity-medium' },
  LOW: { label: 'Low Risk', conf: 'Low confidence', className: 'text-severity-low' },
};

const DISPOSITION_LABEL: Record<AlertDisposition, string> = {
  BENIGN: 'Benign',
  FALSE_POSITIVE: 'False Positive',
  TRUE_POSITIVE_NO_IMPACT: 'True Positive · No Impact',
  TRUE_POSITIVE: 'True Positive',
};

const DISPOSITIONS: { value: AlertDisposition; tone: string }[] = [
  { value: 'BENIGN', tone: 'border-emerald-700/60 bg-emerald-500/10 text-emerald-400' },
  { value: 'FALSE_POSITIVE', tone: 'border-border bg-muted text-foreground' },
  { value: 'TRUE_POSITIVE_NO_IMPACT', tone: 'border-severity-medium/50 bg-severity-medium/10 text-severity-medium' },
  { value: 'TRUE_POSITIVE', tone: 'border-severity-critical/50 bg-severity-critical/10 text-severity-critical' },
];

export default function AlertDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const qc = useQueryClient();
  const [triageOpen, setTriageOpen] = useState(false);
  const [comment, setComment] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['alert', id],
    queryFn: () => api<AlertDetail>(`/alerts/${id}`),
  });

  const patch = useMutation({
    mutationFn: (body: { status?: string; disposition?: string }) =>
      api(`/alerts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alert', id] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['overview'] });
    },
  });
  const setStatus = (status: string) => patch.mutate({ status });
  const setDisposition = (disposition: string) => patch.mutate({ disposition });
  const busy = patch.isPending;

  const addComment = useMutation({
    mutationFn: (body: string) =>
      api(`/alerts/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      setComment('');
      qc.invalidateQueries({ queryKey: ['alert', id] });
    },
  });

  if (isLoading) return <Skeleton className="h-[80vh] w-full" />;
  if (isError || !data)
    return <p className="text-sm text-severity-critical">Alert not found.</p>;

  const ev = data.event;
  const country = (ev?.metadata as any)?.country as string | undefined;
  const reason = (ev?.metadata as any)?.reason as string | undefined;
  const risk = RISK[data.severity];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link href="/alerts" className="hover:text-foreground">
              Alerts
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span>Alert Detail</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {data.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge status={data.status} />
            {data.disposition && <DispositionBadge value={data.disposition} />}
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              First seen: {ev ? new Date(ev.timestamp).toLocaleString() : '—'}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Affected
            </span>
            <Chip icon={Users} label={ev?.email ? '1 User' : '0 Users'} />
            <Chip icon={AppWindow} label={ev?.application ? '1 App' : '0 Apps'} />
            <Chip icon={Network} label={ev?.ipAddress ?? 'No IP'} />
          </div>
        </div>

        <div className="flex w-64 shrink-0 flex-col gap-3">
          <Card>
            <CardContent className="space-y-1 pt-5">
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                <span className={cn('h-2 w-2 rounded-full', risk.className.replace('text-', 'bg-'))} />
                Risk Summary
              </div>
              <div className={cn('text-2xl font-semibold', risk.className)}>
                {risk.label}
              </div>
              <div className="text-sm text-muted-foreground">{risk.conf}</div>
            </CardContent>
          </Card>
          <Button onClick={() => setTriageOpen(true)}>
            <ClipboardCheck className="h-4 w-4" />
            Triage &amp; Notes
            {data.comments.length > 0 && (
              <span className="ml-1 rounded-full bg-primary-foreground/20 px-1.5 text-xs">
                {data.comments.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Context column */}
        <div className="space-y-4 lg:col-span-1">
          <Section icon={Lightbulb} title="What's Happening" accent>
            <ul className="space-y-2.5 text-sm">
              {buildNarrative(data, country).map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section icon={Target} title="Recommended Outcome">
            <p className="text-sm text-muted-foreground">
              Secure the affected account and confirm with the user that this
              activity was authorized. Escalate to an incident if unrecognized.
            </p>
          </Section>

          <Section title="Who / What Is Affected">
            <div className="space-y-3">
              <Affected icon={Users} label="User" value={ev?.email ?? ev?.userId ?? '—'} />
              <Affected icon={AppWindow} label="Application" value={ev?.application?.name ?? '—'} />
              <Affected icon={Monitor} label="User Agent" value={ev?.userAgent ?? '—'} />
              <Affected icon={MapPin} label="Location" value={country ?? 'Unknown'} />
            </div>
          </Section>

          <Section title="Why It's Risky">
            <div className="flex flex-wrap gap-2">
              {buildRiskTags(data, country).map((t) => (
                <span
                  key={t.label}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                    t.tone,
                  )}
                >
                  {t.label}
                </span>
              ))}
            </div>
          </Section>
        </div>

        {/* Evidence + timeline */}
        <div className="space-y-4 lg:col-span-2">
          <EvidenceOverview data={data} country={country} reason={reason} />
          <ActivityTimeline data={data} country={country} reason={reason} />
        </div>
      </div>

      {/* Triage & Notes modal */}
      <Dialog open={triageOpen} onOpenChange={setTriageOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Triage &amp; Notes</DialogTitle>
            <DialogDescription>{data.title}</DialogDescription>
          </DialogHeader>

          {/* Status */}
          <div className="space-y-2">
            <FieldLabel>Status</FieldLabel>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={data.status} />
              {data.disposition && <DispositionBadge value={data.disposition} />}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={busy || data.status === 'ACKNOWLEDGED'}
                onClick={() => setStatus('ACKNOWLEDGED')}
              >
                {data.status === 'ACKNOWLEDGED' ? 'Acknowledged' : 'Acknowledge'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={busy || data.status === 'RESOLVED'}
                onClick={() => setStatus('RESOLVED')}
              >
                {data.status === 'RESOLVED' ? 'Resolved' : 'Resolve'}
              </Button>
            </div>
          </div>

          {/* Classification */}
          <div className="space-y-2">
            <FieldLabel>Classification</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              {DISPOSITIONS.map((d) => (
                <button
                  key={d.value}
                  disabled={busy}
                  onClick={() => setDisposition(d.value)}
                  className={cn(
                    'flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors disabled:opacity-50',
                    data.disposition === d.value
                      ? d.tone
                      : 'border-border hover:bg-accent',
                  )}
                >
                  {DISPOSITION_LABEL[d.value]}
                  {data.disposition === d.value && (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <FieldLabel>Comments</FieldLabel>
            <div className="space-y-2.5">
              {data.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet.</p>
              ) : (
                data.comments.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-md border border-border bg-background p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-medium">
                        {c.author}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
                  </div>
                ))
              )}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment…"
              className="min-h-[64px] w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
            <Button
              className="w-full"
              size="sm"
              disabled={!comment.trim() || addComment.isPending}
              onClick={() => addComment.mutate(comment.trim())}
            >
              {addComment.isPending ? 'Posting…' : 'Post comment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Evidence Overview ─────────────────────────────────────── */

type EvidenceRow = {
  category: 'Account' | 'Device' | 'Network' | 'App';
  icon: any;
  description: string;
  time: string;
  status: 'Verified' | 'Suspected';
};

function EvidenceOverview({
  data,
  country,
  reason,
}: {
  data: AlertDetail;
  country?: string;
  reason?: string;
}) {
  const [tab, setTab] = useState<'All' | EvidenceRow['category']>('All');
  const [q, setQ] = useState('');
  const rows = useMemo(
    () => buildEvidence(data, country, reason),
    [data, country, reason],
  );
  const filtered = rows.filter(
    (r) =>
      (tab === 'All' || r.category === tab) &&
      r.description.toLowerCase().includes(q.toLowerCase()),
  );
  const tabs: ('All' | EvidenceRow['category'])[] = [
    'All',
    'Account',
    'Device',
    'Network',
    'App',
  ];

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Evidence Overview</h2>
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search evidence…"
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                tab === t
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-accent',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-1">
          <div className="grid grid-cols-[24px_1fr_80px_90px] items-center gap-3 px-2 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            <span></span>
            <span>Description</span>
            <span>Time</span>
            <span>Status</span>
          </div>
          {filtered.map((r, i) => {
            const Icon = r.icon;
            return (
              <div
                key={i}
                className="grid grid-cols-[24px_1fr_80px_90px] items-center gap-3 rounded-md px-2 py-2.5 hover:bg-accent"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{r.description}</span>
                <span className="text-xs text-muted-foreground">{r.time}</span>
                <EvidenceStatus status={r.status} />
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No evidence in this category.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EvidenceStatus({ status }: { status: 'Verified' | 'Suspected' }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        status === 'Verified'
          ? 'bg-emerald-500/15 text-emerald-400'
          : 'bg-severity-medium/15 text-severity-medium',
      )}
    >
      {status === 'Verified' ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <ShieldAlert className="h-3 w-3" />
      )}
      {status}
    </span>
  );
}

/* ─── Activity Timeline ─────────────────────────────────────── */

function ActivityTimeline({
  data,
  country,
  reason,
}: {
  data: AlertDetail;
  country?: string;
  reason?: string;
}) {
  const ev = data.event;
  const evTime = ev ? new Date(ev.timestamp).toLocaleTimeString() : '';
  const alTime = new Date(data.createdAt).toLocaleTimeString();

  const groups = [
    {
      title: 'Detection',
      items: [
        ev && { time: evTime, text: `Event observed: ${ev.eventType}`, active: true },
        ev?.ipAddress && { time: evTime, text: `Source IP ${ev.ipAddress}${country ? ` (${country})` : ''}`, active: false },
        reason && { time: evTime, text: `Reason: ${reason}`, active: false },
        { time: alTime, text: `Alert raised: ${data.title}`, active: true },
      ].filter(Boolean) as { time: string; text: string; active: boolean }[],
    },
    {
      title: 'Response',
      items: [
        { time: alTime, text: `Status: ${data.status}`, active: true },
        data.disposition && { time: '', text: `Classified: ${DISPOSITION_LABEL[data.disposition]}`, active: true },
        data.incident && { time: '', text: `Linked to incident: ${data.incident.title}`, active: false },
      ].filter(Boolean) as { time: string; text: string; active: boolean }[],
    },
  ];

  return (
    <Card>
      <CardContent className="pt-5">
        <h2 className="text-base font-semibold">Activity Timeline</h2>
        <div className="mt-4 space-y-6">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {g.title}
              </div>
              <div className="space-y-3 border-l border-border pl-4">
                {g.items.map((it, i) => (
                  <div key={i} className="relative flex items-baseline gap-4">
                    <span
                      className={cn(
                        'absolute -left-[22px] top-1 h-2 w-2 rounded-full',
                        it.active ? 'bg-emerald-400' : 'bg-muted-foreground',
                      )}
                    />
                    <span className="w-16 shrink-0 text-xs text-muted-foreground">
                      {it.time}
                    </span>
                    <span className="text-sm">{it.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Derivation helpers ────────────────────────────────────── */

function buildNarrative(data: AlertDetail, country?: string): string[] {
  const ev = data.event;
  const out: string[] = [];
  if (data.description) out.push(data.description);
  if (ev?.eventType === 'LOGIN_FAILED')
    out.push('Multiple failed authentication attempts were detected.');
  if (ev?.ipAddress)
    out.push(
      `Activity originated from ${ev.ipAddress}${country ? ` in ${country}` : ''}.`,
    );
  if (ev?.email) out.push(`The account ${ev.email} was involved.`);
  if (out.length === 0)
    out.push('A security detection rule matched recent event activity.');
  return out;
}

function buildRiskTags(data: AlertDetail, country?: string) {
  const ev = data.event;
  const tags: { label: string; tone: string }[] = [];
  const red = 'bg-severity-critical/10 text-severity-critical ring-severity-critical/25';
  const amber = 'bg-severity-medium/10 text-severity-medium ring-severity-medium/25';
  tags.push({
    label: `${data.severity} severity`,
    tone: data.severity === 'CRITICAL' || data.severity === 'HIGH' ? red : amber,
  });
  if (ev?.eventType === 'LOGIN_FAILED')
    tags.push({ label: 'Repeated failed logins', tone: red });
  if (data.ruleId?.includes('brute'))
    tags.push({ label: 'Brute force', tone: red });
  if (country && HIGH_RISK_COUNTRIES.includes(country))
    tags.push({ label: 'High-risk country', tone: amber });
  if (ev?.statusCode && ev.statusCode >= 400)
    tags.push({ label: 'Access denied', tone: amber });
  return tags;
}

function buildEvidence(
  data: AlertDetail,
  country?: string,
  reason?: string,
): EvidenceRow[] {
  const ev = data.event;
  if (!ev) return [];
  const time = new Date(ev.timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
  const rows: EvidenceRow[] = [
    { category: 'Account', icon: KeyRound, description: `${ev.eventType} on ${ev.endpoint ?? 'endpoint'}`, time, status: 'Verified' },
  ];
  if (country)
    rows.push({ category: 'Network', icon: MapPin, description: `Login originated from ${country}`, time, status: 'Verified' });
  if (ev.ipAddress)
    rows.push({ category: 'Network', icon: Network, description: `Source IP ${ev.ipAddress}`, time, status: 'Suspected' });
  const threat = (ev.metadata as any)?.threat as
    | { score?: number; listed?: boolean; source?: string }
    | undefined;
  if (threat && (threat.listed || (threat.score ?? 0) > 0))
    rows.push({
      category: 'Network',
      icon: ShieldAlert,
      description: `IP reputation: ${threat.score ?? 0}/100${
        threat.listed ? ' · blocklisted' : ''
      }${threat.source ? ` (${threat.source})` : ''}`,
      time,
      status:
        threat.listed || (threat.score ?? 0) >= 25 ? 'Suspected' : 'Verified',
    });
  if (ev.userAgent)
    rows.push({ category: 'Device', icon: Monitor, description: `Device: ${ev.userAgent}`, time, status: 'Verified' });
  if (ev.statusCode != null)
    rows.push({ category: 'Account', icon: ShieldCheck, description: `Response status ${ev.statusCode}`, time, status: 'Verified' });
  if (ev.application)
    rows.push({ category: 'App', icon: AppWindow, description: `Target application: ${ev.application.name}`, time, status: 'Verified' });
  if (reason)
    rows.push({ category: 'Account', icon: ShieldAlert, description: `Reason: ${reason}`, time, status: 'Suspected' });
  return rows;
}

/* ─── Small pieces ──────────────────────────────────────────── */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  accent,
  children,
}: {
  icon?: any;
  title: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className={accent ? 'border-primary/20 bg-primary/[0.03]' : ''}>
      <CardContent className="pt-5">
        <div className="mb-3 flex items-center gap-2">
          {Icon && (
            <Icon
              className={cn(
                'h-4 w-4',
                accent ? 'text-primary' : 'text-muted-foreground',
              )}
            />
          )}
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </h3>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function DispositionBadge({ value }: { value: AlertDisposition }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
      {DISPOSITION_LABEL[value]}
    </span>
  );
}

function Chip({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function Affected({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="truncate text-sm">{value}</div>
      </div>
    </div>
  );
}

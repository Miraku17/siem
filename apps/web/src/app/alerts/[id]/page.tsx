'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Clock, ClipboardCheck, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { AlertDetail, AlertDisposition } from '@/lib/types';
import { cn } from '@/lib/utils';
import { relativeTime } from '@/lib/format';
import { SeverityBadge, StatusBadge, ApplicationBadge } from '@/components/badges';
import { Card, CardContent } from '@/components/ui/card';
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

  if (isLoading) return <Skeleton className="h-[70vh] w-full" />;
  if (isError || !data)
    return <p className="text-sm text-severity-critical">Alert not found.</p>;

  const ev = data.event;
  const meta = (ev?.metadata ?? {}) as Record<string, any>;
  const country = meta.country as string | undefined;
  const place = [meta.city, country].filter(Boolean).join(', ');
  const threat = meta.threat as
    | { score?: number; listed?: boolean; source?: string }
    | undefined;
  const flagged = !!threat && (threat.listed || (threat.score ?? 0) > 0);

  return (
    <div className="space-y-5">
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
            <SeverityBadge severity={data.severity} />
            <StatusBadge status={data.status} />
            {data.disposition && <DispositionBadge value={data.disposition} />}
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {ev
                ? relativeTime(ev.timestamp)
                : relativeTime(data.createdAt)}
            </span>
          </div>
        </div>
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

      {/* Summary */}
      <Card>
        <CardContent className="space-y-4 pt-5">
          <div>
            <SectionLabel>What happened</SectionLabel>
            <p className="mt-1.5 text-sm">{summarize(data, place)}</p>
          </div>
          {buildRiskTags(data, country, flagged).length > 0 && (
            <div>
              <SectionLabel>Why it matters</SectionLabel>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {buildRiskTags(data, country, flagged).map((t) => (
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
            </div>
          )}
          <div>
            <SectionLabel>Recommended action</SectionLabel>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Confirm with the affected user that this activity was authorized.
              If not, secure the account (reset password, revoke sessions) and
              classify it in Triage.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Details + Timeline */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-5">
            <h2 className="mb-4 text-base font-semibold">Event Details</h2>
            {ev ? (
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <Fact label="Event" value={ev.eventType} />
                <Fact
                  label="Detected"
                  value={new Date(ev.timestamp).toLocaleString()}
                />
                <Fact label="Actor" value={ev.email ?? ev.userId} />
                <Fact
                  label="Application"
                  value={
                    ev.application ? (
                      <ApplicationBadge
                        name={ev.application.name}
                        slug={ev.application.slug}
                      />
                    ) : undefined
                  }
                />
                <Fact
                  label="Source IP"
                  value={
                    ev.ipAddress ? (
                      <span className="inline-flex items-center gap-2 font-mono text-xs">
                        {ev.ipAddress}
                        {flagged && (
                          <span
                            className={cn(
                              'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                              (threat!.score ?? 0) >= 80 || threat!.listed
                                ? 'bg-severity-critical/15 text-severity-critical'
                                : 'bg-severity-high/15 text-severity-high',
                            )}
                          >
                            threat {threat!.score ?? 0}/100
                          </span>
                        )}
                      </span>
                    ) : undefined
                  }
                />
                <Fact label="Location" value={place || undefined} />
                <Fact
                  label="Endpoint"
                  value={
                    ev.endpoint
                      ? `${ev.method ?? ''} ${ev.endpoint}`.trim()
                      : undefined
                  }
                  mono
                />
                <Fact
                  label="Status"
                  value={ev.statusCode != null ? String(ev.statusCode) : undefined}
                  mono
                />
                <Fact label="Detection rule" value={data.ruleId ?? undefined} mono />
                <Fact label="Reason" value={meta.reason} />
                <Fact
                  label="User agent"
                  value={ev.userAgent}
                  className="sm:col-span-2"
                />
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                No event linked to this alert.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardContent className="pt-5">
            <h2 className="mb-4 text-base font-semibold">Activity</h2>
            <div className="space-y-3 border-l border-border pl-4">
              {buildTimeline(data).map((t, i) => (
                <div key={i} className="relative">
                  <span
                    className={cn(
                      'absolute -left-[22px] top-1.5 h-2 w-2 rounded-full',
                      t.active ? 'bg-emerald-400' : 'bg-muted-foreground',
                    )}
                  />
                  <div className="text-sm">{t.text}</div>
                  {t.time && (
                    <div className="text-[11px] text-muted-foreground">
                      {t.time}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Triage & Notes modal */}
      <Dialog open={triageOpen} onOpenChange={setTriageOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Triage &amp; Notes</DialogTitle>
            <DialogDescription>{data.title}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <SectionLabel>Status</SectionLabel>
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

          <div className="space-y-2">
            <SectionLabel>Classification</SectionLabel>
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

          <div className="space-y-2">
            <SectionLabel>Comments</SectionLabel>
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

/* ─── Helpers ────────────────────────────────────────────────── */

function summarize(data: AlertDetail, place: string): string {
  const ev = data.event;
  if (data.description) return data.description;
  if (ev)
    return `A ${ev.eventType} event${
      ev.email ? ` for ${ev.email}` : ''
    }${ev.ipAddress ? ` from ${ev.ipAddress}` : ''}${
      place ? ` (${place})` : ''
    } matched the ${data.ruleId ?? 'detection'} rule.`;
  return 'A detection rule matched recent event activity.';
}

function buildRiskTags(data: AlertDetail, country: string | undefined, flagged: boolean) {
  const tags: { label: string; tone: string }[] = [];
  const red = 'bg-severity-critical/10 text-severity-critical ring-severity-critical/25';
  const amber = 'bg-severity-medium/10 text-severity-medium ring-severity-medium/25';
  if (flagged) tags.push({ label: 'Malicious IP', tone: red });
  if (data.event?.eventType === 'LOGIN_FAILED')
    tags.push({ label: 'Failed logins', tone: red });
  if (data.ruleId?.includes('brute'))
    tags.push({ label: 'Brute force', tone: red });
  if (data.ruleId?.includes('takeover') || data.ruleId?.includes('mfa'))
    tags.push({ label: 'Account takeover risk', tone: red });
  if (country && HIGH_RISK_COUNTRIES.includes(country))
    tags.push({ label: 'High-risk country', tone: amber });
  return tags;
}

function buildTimeline(data: AlertDetail) {
  const ev = data.event;
  const out: { text: string; time?: string; active: boolean }[] = [];
  if (ev)
    out.push({
      text: `Event observed — ${ev.eventType}`,
      time: new Date(ev.timestamp).toLocaleString(),
      active: true,
    });
  out.push({
    text: `Alert raised — ${data.title}`,
    time: new Date(data.createdAt).toLocaleString(),
    active: true,
  });
  out.push({ text: `Status: ${data.status.replace(/_/g, ' ')}`, active: true });
  if (data.disposition)
    out.push({
      text: `Classified: ${DISPOSITION_LABEL[data.disposition]}`,
      active: true,
    });
  if (data.incident)
    out.push({ text: `Linked to incident: ${data.incident.title}`, active: false });
  return out;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  );
}

function Fact({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  if (value == null || value === '') return null;
  return (
    <div className={className}>
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={cn('mt-0.5 break-words text-sm', mono && 'font-mono text-xs')}>
        {value}
      </dd>
    </div>
  );
}

function DispositionBadge({ value }: { value: AlertDisposition }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
      {DISPOSITION_LABEL[value]}
    </span>
  );
}

import { PageHeader } from '@/components/page-header';

// Investigation page — vertical timeline for a selected event:
//   LOGIN_FAILED -> LOGIN_FAILED -> ... -> Alert Generated -> Incident Created
export default function InvestigationPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="space-y-5">
      <PageHeader title="Investigation" description="Correlated event timeline." />
      <p className="text-sm text-muted-foreground">
        Event <code className="font-mono text-xs">{params.id}</code> — TODO:
        correlated timeline of related events, the alert(s) it triggered, and any
        resulting incident.
      </p>
    </div>
  );
}

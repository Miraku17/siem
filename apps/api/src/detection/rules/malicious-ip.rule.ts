import { SecurityEvent } from '@prisma/client';
import { DetectionRule, RuleMatch } from '../detection-rule.interface';

// Flags any event whose source IP is on a threat-intel blocklist or carries a
// high abuse-confidence score. The score/flags are attached at ingestion by
// threat-intel enrichment (AbuseIPDB or a DNSBL fallback).
export const maliciousIpRule: DetectionRule = {
  id: 'intel.malicious_ip',
  async evaluate(event: SecurityEvent): Promise<RuleMatch | null> {
    if (!event.ipAddress || !event.metadata) return null;

    const threat = (event.metadata as Record<string, unknown>).threat as
      | { score?: number; listed?: boolean; source?: string; reports?: number }
      | undefined;
    if (!threat) return null;

    const score = threat.score ?? (threat.listed ? 75 : 0);
    if (!threat.listed && score < 50) return null;

    return {
      title: 'Event from a known-malicious IP',
      severity: score >= 80 ? 'CRITICAL' : 'HIGH',
      description: `${event.ipAddress} is flagged by threat intelligence (score ${score}${
        threat.reports ? `, ${threat.reports} reports` : ''
      }${threat.source ? ` · ${threat.source}` : ''}).`,
      dedupe: { field: 'ipAddress', value: event.ipAddress, windowMs: 6 * 3600_000 },
    };
  },
};

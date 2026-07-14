import { SecurityEvent } from '@prisma/client';
import {
  DetectionRule,
  RuleMatch,
  DedupeKey,
} from '../detection-rule.interface';
import { PrismaService } from '../../prisma/prisma.service';

// Many DATA_EXPORT events from one actor in a short window = likely data
// exfiltration (e.g. someone bulk-exporting financial reports before leaving,
// or a compromised account draining data).
export const massExportRule: DetectionRule = {
  id: 'data.mass_export',
  async evaluate(
    event: SecurityEvent,
    prisma: PrismaService,
  ): Promise<RuleMatch | null> {
    if (event.eventType !== 'DATA_EXPORT') return null;

    const field: DedupeKey['field'] | null = event.userId
      ? 'userId'
      : event.email
        ? 'email'
        : null;
    if (!field) return null;
    const value = (event.userId ?? event.email) as string;

    const count = await prisma.securityEvent.count({
      where: {
        eventType: 'DATA_EXPORT',
        [field]: value,
        timestamp: { gte: new Date(event.timestamp.getTime() - 10 * 60_000) },
      } as any,
    });

    if (count >= 5) {
      return {
        title: 'Possible data exfiltration',
        severity: 'HIGH',
        description: `${
          event.email ?? event.userId
        } exported ${count} reports within 10 minutes.`,
        dedupe: { field, value },
      };
    }
    return null;
  },
};

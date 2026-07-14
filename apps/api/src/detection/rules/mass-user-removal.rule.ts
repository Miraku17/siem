import { SecurityEvent } from '@prisma/client';
import {
  DetectionRule,
  RuleMatch,
  DedupeKey,
} from '../detection-rule.interface';
import { PrismaService } from '../../prisma/prisma.service';

// One actor removing several members in a short window — bulk offboarding, or
// an insider/compromised admin purging accounts.
export const massUserRemovalRule: DetectionRule = {
  id: 'authz.mass_user_removal',
  async evaluate(
    event: SecurityEvent,
    prisma: PrismaService,
  ): Promise<RuleMatch | null> {
    if (event.eventType !== 'USER_DELETED') return null;

    const field: DedupeKey['field'] | null = event.userId
      ? 'userId'
      : event.email
        ? 'email'
        : null;
    if (!field) return null;
    const value = (event.userId ?? event.email) as string;

    const count = await prisma.securityEvent.count({
      where: {
        eventType: 'USER_DELETED',
        [field]: value,
        timestamp: { gte: new Date(event.timestamp.getTime() - 10 * 60_000) },
      } as any,
    });

    if (count >= 3) {
      return {
        title: 'Bulk user removal',
        severity: 'HIGH',
        description: `${
          event.email ?? event.userId
        } removed ${count} members within 10 minutes.`,
        dedupe: { field, value },
      };
    }
    return null;
  },
};

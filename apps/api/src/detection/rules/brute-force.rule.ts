import { SecurityEvent } from '@prisma/client';
import { DetectionRule, RuleMatch } from '../detection-rule.interface';
import { PrismaService } from '../../prisma/prisma.service';

// 5 LOGIN_FAILED from the same IP within 60s  -> MEDIUM
// 50 LOGIN_FAILED from the same IP within 5m  -> CRITICAL
export const bruteForceRule: DetectionRule = {
  id: 'auth.brute_force',
  async evaluate(
    event: SecurityEvent,
    prisma: PrismaService,
  ): Promise<RuleMatch | null> {
    if (event.eventType !== 'LOGIN_FAILED' || !event.ipAddress) return null;

    const count = async (windowMs: number) =>
      prisma.securityEvent.count({
        where: {
          applicationId: event.applicationId,
          eventType: 'LOGIN_FAILED',
          ipAddress: event.ipAddress,
          createdAt: { gte: new Date(event.createdAt.getTime() - windowMs) },
        },
      });

    if ((await count(5 * 60_000)) >= 50) {
      return {
        title: 'Credential stuffing / brute force',
        severity: 'CRITICAL',
        description: `50+ failed logins from ${event.ipAddress} within 5 minutes.`,
        dedupe: { field: 'ipAddress', value: event.ipAddress },
      };
    }

    if ((await count(60_000)) >= 5) {
      return {
        title: 'Repeated failed logins',
        severity: 'MEDIUM',
        description: `5+ failed logins from ${event.ipAddress} within 60 seconds.`,
        dedupe: { field: 'ipAddress', value: event.ipAddress },
      };
    }

    return null;
  },
};

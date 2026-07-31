import { SecurityEvent } from '@prisma/client';
import { DetectionRule, RuleMatch } from '../detection-rule.interface';
import { PrismaService } from '../../prisma/prisma.service';

// A LOGIN_SUCCESS preceded by many LOGIN_FAILED from the same IP means the
// brute force *worked* — the most urgent auth signal there is.
export const bruteForceSuccessRule: DetectionRule = {
  id: 'auth.brute_force_success',
  async evaluate(
    event: SecurityEvent,
    prisma: PrismaService,
  ): Promise<RuleMatch | null> {
    if (event.eventType !== 'LOGIN_SUCCESS' || !event.ipAddress) return null;

    const fails = await prisma.securityEvent.count({
      where: {
        applicationId: event.applicationId,
        eventType: 'LOGIN_FAILED',
        ipAddress: event.ipAddress,
        createdAt: {
          gte: new Date(event.createdAt.getTime() - 10 * 60_000),
          lt: event.createdAt,
        },
      },
    });

    if (fails >= 5) {
      return {
        title: 'Successful login after brute force',
        severity: 'CRITICAL',
        description: `${fails} failed logins then a successful login from ${event.ipAddress} — the account may be compromised.`,
        dedupe: { field: 'ipAddress', value: event.ipAddress },
      };
    }
    return null;
  },
};

import { SecurityEvent } from '@prisma/client';
import { DetectionRule, RuleMatch } from '../detection-rule.interface';
import { PrismaService } from '../../prisma/prisma.service';

// Classic account-takeover chain: a password reset followed by a successful
// login from an IP the account has never used before.
export const takeoverChainRule: DetectionRule = {
  id: 'auth.takeover_chain',
  async evaluate(
    event: SecurityEvent,
    prisma: PrismaService,
  ): Promise<RuleMatch | null> {
    if (
      event.eventType !== 'LOGIN_SUCCESS' ||
      !event.userId ||
      !event.ipAddress
    )
      return null;

    // A password reset for this user in the last 6 hours.
    const reset = await prisma.securityEvent.findFirst({
      where: {
        applicationId: event.applicationId,
        eventType: 'PASSWORD_RESET',
        userId: event.userId,
        createdAt: {
          gte: new Date(event.createdAt.getTime() - 6 * 3600_000),
          lt: event.createdAt,
        },
      },
      select: { id: true },
    });
    if (!reset) return null;

    // ...and this IP has never been seen for the account before now.
    const seenBefore = await prisma.securityEvent.count({
      where: {
        applicationId: event.applicationId,
        userId: event.userId,
        ipAddress: event.ipAddress,
        id: { not: event.id },
        createdAt: { lt: event.createdAt },
      },
    });
    if (seenBefore > 0) return null;

    return {
      title: 'Account takeover: reset then new-device login',
      severity: 'CRITICAL',
      description: `${
        event.email ?? event.userId
      } signed in from a never-before-seen IP ${event.ipAddress} shortly after a password reset.`,
      dedupe: { field: 'userId', value: event.userId, windowMs: 6 * 3600_000 },
    };
  },
};

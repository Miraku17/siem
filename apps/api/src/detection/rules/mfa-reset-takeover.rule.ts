import { SecurityEvent } from '@prisma/client';
import { DetectionRule, RuleMatch } from '../detection-rule.interface';
import { PrismaService } from '../../prisma/prisma.service';

// An admin reset a user's MFA, and then that account signed in. Legitimate
// during support, but it's also the exact move an attacker/insider makes to
// seize an MFA-protected account — so surface it loudly.
export const mfaResetTakeoverRule: DetectionRule = {
  id: 'auth.mfa_reset_takeover',
  async evaluate(
    event: SecurityEvent,
    prisma: PrismaService,
  ): Promise<RuleMatch | null> {
    if (event.eventType !== 'LOGIN_SUCCESS' || !event.userId) return null;

    // An ADMIN_MFA_RESET targeting THIS user in the last 6 hours.
    const reset = await prisma.securityEvent.findFirst({
      where: {
        eventType: 'ADMIN_MFA_RESET',
        timestamp: {
          gte: new Date(event.timestamp.getTime() - 6 * 3600_000),
          lt: event.timestamp,
        },
        metadata: { path: ['targetUserId'], equals: event.userId },
      },
      select: { id: true },
    });
    if (!reset) return null;

    return {
      title: 'Login after admin MFA reset',
      severity: 'CRITICAL',
      description: `${
        event.email ?? event.userId
      } signed in shortly after an admin reset this account's MFA — possible account takeover.`,
      dedupe: { field: 'userId', value: event.userId, windowMs: 6 * 3600_000 },
    };
  },
};

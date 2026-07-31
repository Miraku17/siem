import { SecurityEvent } from '@prisma/client';
import { DetectionRule, RuleMatch } from '../detection-rule.interface';
import { PrismaService } from '../../prisma/prisma.service';

// Repeated MFA_FAILED for one user = an attacker who has the password but is
// stuck on the second factor (or bombarding the user with prompts).
export const mfaFatigueRule: DetectionRule = {
  id: 'auth.mfa_fatigue',
  async evaluate(
    event: SecurityEvent,
    prisma: PrismaService,
  ): Promise<RuleMatch | null> {
    if (event.eventType !== 'MFA_FAILED' || !event.userId) return null;

    const count = await prisma.securityEvent.count({
      where: {
        applicationId: event.applicationId,
        eventType: 'MFA_FAILED',
        userId: event.userId,
        createdAt: { gte: new Date(event.createdAt.getTime() - 10 * 60_000) },
      },
    });

    if (count >= 5) {
      return {
        title: 'Possible MFA fatigue',
        severity: 'HIGH',
        description: `${count} failed MFA attempts for ${
          event.email ?? event.userId
        } within 10 minutes.`,
        dedupe: { field: 'userId', value: event.userId },
      };
    }
    return null;
  },
};

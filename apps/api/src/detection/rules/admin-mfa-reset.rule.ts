import { SecurityEvent } from '@prisma/client';
import { DetectionRule, RuleMatch } from '../detection-rule.interface';

// Surfaces the sensitive admin action itself (even if no login follows). An
// admin wiping another user's MFA is always audit-worthy.
export const adminMfaResetRule: DetectionRule = {
  id: 'authz.admin_mfa_reset',
  async evaluate(event: SecurityEvent): Promise<RuleMatch | null> {
    if (event.eventType !== 'ADMIN_MFA_RESET') return null;

    const meta = (event.metadata ?? {}) as Record<string, unknown>;
    const target =
      typeof meta.targetUserId === 'string' ? meta.targetUserId : 'a user';

    return {
      title: 'Admin reset a user’s MFA',
      severity: 'MEDIUM',
      description: `${event.email ?? 'An admin'} reset MFA for ${target}.`,
      dedupe: event.userId
        ? { field: 'userId', value: event.userId }
        : undefined,
    };
  },
};

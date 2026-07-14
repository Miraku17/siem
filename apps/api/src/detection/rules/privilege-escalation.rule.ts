import { SecurityEvent } from '@prisma/client';
import { DetectionRule, RuleMatch } from '../detection-rule.interface';
import { PrismaService } from '../../prisma/prisma.service';

// Someone was promoted to admin. Legitimate most of the time, but privilege
// grants are exactly what an attacker does after a takeover — always worth a look.
export const privilegeEscalationRule: DetectionRule = {
  id: 'authz.privilege_escalation',
  async evaluate(event: SecurityEvent): Promise<RuleMatch | null> {
    if (event.eventType !== 'ROLE_CHANGED') return null;

    const meta = (event.metadata ?? {}) as Record<string, unknown>;
    if (meta.to !== 'admin') return null;

    const target = typeof meta.targetUser === 'string' ? meta.targetUser : 'a user';
    const actor = event.email ?? 'An administrator';

    return {
      title: 'Privilege escalation to admin',
      severity: 'HIGH',
      description: `${actor} promoted ${target} to admin${
        typeof meta.from === 'string' ? ` (from ${meta.from})` : ''
      }.`,
      dedupe: event.userId
        ? { field: 'userId', value: event.userId }
        : undefined,
    };
  },
};

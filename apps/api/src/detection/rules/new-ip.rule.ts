import { SecurityEvent } from '@prisma/client';
import { DetectionRule, RuleMatch } from '../detection-rule.interface';
import { PrismaService } from '../../prisma/prisma.service';

// A successful login from an IP this account has never used. Lower-severity
// awareness signal (new device/network); the takeover-chain rule handles the
// dangerous reset+new-IP case separately.
export const newIpRule: DetectionRule = {
  id: 'auth.new_ip',
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

    const priorSameIp = await prisma.securityEvent.count({
      where: {
        applicationId: event.applicationId,
        userId: event.userId,
        ipAddress: event.ipAddress,
        id: { not: event.id },
        createdAt: { lt: event.createdAt },
      },
    });
    if (priorSameIp > 0) return null;

    // Skip the very first login for an account (nothing to compare against).
    const priorLogins = await prisma.securityEvent.count({
      where: {
        applicationId: event.applicationId,
        userId: event.userId,
        eventType: 'LOGIN_SUCCESS',
        id: { not: event.id },
        createdAt: { lt: event.createdAt },
      },
    });
    if (priorLogins === 0) return null;

    return {
      title: 'Login from a new IP',
      severity: 'MEDIUM',
      description: `${
        event.email ?? event.userId
      } signed in from a new IP address (${event.ipAddress}).`,
      dedupe: { field: 'userId', value: event.userId, windowMs: 24 * 3600_000 },
    };
  },
};

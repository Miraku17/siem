import { SecurityEvent } from '@prisma/client';
import { DetectionRule, RuleMatch } from '../detection-rule.interface';
import { PrismaService } from '../../prisma/prisma.service';

// A login from a country this user has never signed in from. Requires
// `metadata.country` (populate it with GeoIP enrichment at ingestion).
export const newCountryRule: DetectionRule = {
  id: 'auth.new_country',
  async evaluate(
    event: SecurityEvent,
    prisma: PrismaService,
  ): Promise<RuleMatch | null> {
    if (
      event.eventType !== 'LOGIN_SUCCESS' ||
      !event.userId ||
      !event.metadata
    )
      return null;

    const country = (event.metadata as Record<string, unknown>).country;
    if (typeof country !== 'string' || !country) return null;

    // Only meaningful once the user has history — a first-ever login isn't "new".
    const priorAny = await prisma.securityEvent.count({
      where: {
        userId: event.userId,
        id: { not: event.id },
        timestamp: { lt: event.timestamp },
      },
    });
    if (priorAny === 0) return null;

    const priorInCountry = await prisma.securityEvent.count({
      where: {
        userId: event.userId,
        id: { not: event.id },
        timestamp: { lt: event.timestamp },
        metadata: { path: ['country'], equals: country },
      },
    });
    if (priorInCountry > 0) return null;

    return {
      title: 'Login from a new country',
      severity: 'HIGH',
      description: `${
        event.email ?? event.userId
      } signed in from ${country}, a country not seen for this account before.`,
      dedupe: { field: 'userId', value: event.userId, windowMs: 24 * 3600_000 },
    };
  },
};

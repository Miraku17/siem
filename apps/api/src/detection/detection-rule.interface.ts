import { SecurityEvent } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// When present, the engine suppresses duplicate alerts from the same rule for
// the same entity (IP / user / email) within `windowMs` — so a burst of matching
// events raises one alert, not dozens. Matched against past alerts via their
// linked event, so no schema/column is needed.
export interface DedupeKey {
  field: 'ipAddress' | 'userId' | 'email';
  value: string;
  windowMs?: number;
}

export interface RuleMatch {
  title: string;
  severity: Severity;
  description: string;
  dedupe?: DedupeKey;
}

// A detection rule inspects the triggering event (with DB access for
// windowed/aggregate queries) and returns a RuleMatch when it fires.
export interface DetectionRule {
  id: string;
  evaluate(
    event: SecurityEvent,
    prisma: PrismaService,
  ): Promise<RuleMatch | null>;
}

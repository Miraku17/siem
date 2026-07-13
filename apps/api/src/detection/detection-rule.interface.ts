import { SecurityEvent } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface RuleMatch {
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
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

// Shared test database helpers. Every spec talks to a real Postgres (the
// `siem_test` database from docker-compose) because the behaviour under test
// *is* the SQL — cross-tenant filtering, JSON path matching, time windows.
// A mocked Prisma would assert on query shape, not on what the query returns.
import { PrismaClient, Severity } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  generateApiKey,
  hashApiKey,
  keyPrefixOf,
} from '../src/auth/api-key.util';

export const prisma = new PrismaClient() as unknown as PrismaService;

export async function resetDb() {
  await (prisma as unknown as PrismaClient).$executeRawUnsafe(
    'TRUNCATE alert_comments, alerts, incidents, security_events, applications, users RESTART IDENTITY CASCADE',
  );
}

export async function disconnect() {
  await (prisma as unknown as PrismaClient).$disconnect();
}

let appSeq = 0;

// A registered source application. Each call makes a distinct tenant.
// The plaintext key is returned alongside the row, mirroring registration.
export async function makeApp(slug?: string) {
  const n = ++appSeq;
  const s = slug ?? `app-${n}-${Date.now()}`;
  const apiKey = generateApiKey();
  const app = await (prisma as unknown as PrismaClient).application.create({
    data: {
      name: s,
      slug: s,
      apiKeyHash: hashApiKey(apiKey),
      keyPrefix: keyPrefixOf(apiKey),
    },
  });
  return { ...app, apiKey };
}

export interface EventInput {
  applicationId: string;
  eventType: string;
  severity?: Severity;
  userId?: string | null;
  email?: string | null;
  ipAddress?: string | null;
  timestamp?: Date;
  createdAt?: Date;
  metadata?: Record<string, unknown>;
}

export function makeEvent(input: EventInput) {
  const now = new Date();
  return (prisma as unknown as PrismaClient).securityEvent.create({
    data: {
      applicationId: input.applicationId,
      eventType: input.eventType,
      severity: input.severity ?? 'LOW',
      userId: input.userId ?? undefined,
      email: input.email ?? undefined,
      ipAddress: input.ipAddress ?? undefined,
      // Pass either and the other mirrors it, so a spec that only cares about
      // ordering doesn't accidentally leave one of them pinned to "now".
      timestamp: input.timestamp ?? input.createdAt ?? now,
      createdAt: input.createdAt ?? input.timestamp ?? now,
      metadata: (input.metadata ?? {}) as object,
    },
  });
}

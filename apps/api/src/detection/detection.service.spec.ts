import { PrismaClient } from '@prisma/client';
import { DetectionService } from './detection.service';
import { prisma, resetDb, disconnect, makeApp, makeEvent } from '../../test/db';

const db = prisma as unknown as PrismaClient;
const detection = new DetectionService(prisma);

beforeEach(resetDb);
afterAll(disconnect);

const IP = '192.0.2.44';

// Drives a full brute-force burst through the engine for one application.
async function bruteForceBurst(applicationId: string, base: Date) {
  for (let i = 0; i < 4; i++) {
    await makeEvent({
      applicationId,
      eventType: 'LOGIN_FAILED',
      ipAddress: IP,
      createdAt: new Date(base.getTime() - (i + 1) * 1000),
    });
  }
  const trigger = await makeEvent({
    applicationId,
    eventType: 'LOGIN_FAILED',
    ipAddress: IP,
    createdAt: base,
  });
  await detection.evaluate(trigger);
}

describe('DetectionService dedup', () => {
  it('raises one alert for a burst against a single application', async () => {
    const app = await makeApp();
    const base = new Date();
    await bruteForceBurst(app.id, base);
    await bruteForceBurst(app.id, new Date(base.getTime() + 2000));

    const alerts = await db.alert.findMany({ where: { ruleId: 'auth.brute_force' } });
    expect(alerts).toHaveLength(1);
  });

  it('alerts each application separately for the same attacker IP', async () => {
    const first = await makeApp();
    const second = await makeApp();
    const base = new Date();

    await bruteForceBurst(first.id, base);
    await bruteForceBurst(second.id, new Date(base.getTime() + 2000));

    const alerts = await db.alert.findMany({
      where: { ruleId: 'auth.brute_force' },
      include: { event: { select: { applicationId: true } } },
    });

    expect(alerts).toHaveLength(2);
    expect(alerts.map((a) => a.event!.applicationId).sort()).toEqual(
      [first.id, second.id].sort(),
    );
  });
});

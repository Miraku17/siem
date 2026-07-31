import { bruteForceRule } from './brute-force.rule';
import { prisma, resetDb, disconnect, makeApp, makeEvent } from '../../../test/db';

beforeEach(resetDb);
afterAll(disconnect);

const IP = '203.0.113.9';

describe('auth.brute_force', () => {
  it('fires when one application sees 5 failed logins from an IP in 60s', async () => {
    const app = await makeApp();
    const base = new Date();
    for (let i = 0; i < 4; i++) {
      await makeEvent({
        applicationId: app.id,
        eventType: 'LOGIN_FAILED',
        ipAddress: IP,
        timestamp: new Date(base.getTime() - (i + 1) * 1000),
      });
    }
    const trigger = await makeEvent({
      applicationId: app.id,
      eventType: 'LOGIN_FAILED',
      ipAddress: IP,
      timestamp: base,
    });

    const match = await bruteForceRule.evaluate(trigger, prisma);

    expect(match).not.toBeNull();
    expect(match!.severity).toBe('MEDIUM');
  });

  it('does not correlate failures from a different application', async () => {
    const victim = await makeApp();
    const other = await makeApp();
    const base = new Date();

    // 3 failures against the other tenant — must not count toward the victim.
    for (let i = 0; i < 3; i++) {
      await makeEvent({
        applicationId: other.id,
        eventType: 'LOGIN_FAILED',
        ipAddress: IP,
        timestamp: new Date(base.getTime() - (i + 1) * 1000),
      });
    }
    // Only 2 against the victim (including the trigger) — below the threshold.
    await makeEvent({
      applicationId: victim.id,
      eventType: 'LOGIN_FAILED',
      ipAddress: IP,
      timestamp: new Date(base.getTime() - 1000),
    });
    const trigger = await makeEvent({
      applicationId: victim.id,
      eventType: 'LOGIN_FAILED',
      ipAddress: IP,
      timestamp: base,
    });

    const match = await bruteForceRule.evaluate(trigger, prisma);

    expect(match).toBeNull();
  });

  it('still fires when the sender backdates timestamps to escape the window', async () => {
    const app = await makeApp();
    const ingestedAt = new Date();

    // Evasion: a caller with a stolen API key spreads its failures months apart
    // using the client-supplied `timestamp`, while actually delivering them all
    // within seconds. Windowing on `timestamp` misses this entirely; windowing
    // on the server-assigned `createdAt` catches it.
    for (let i = 0; i < 4; i++) {
      await makeEvent({
        applicationId: app.id,
        eventType: 'LOGIN_FAILED',
        ipAddress: IP,
        timestamp: new Date(ingestedAt.getTime() - (i + 1) * 86_400_000 * 30),
        createdAt: new Date(ingestedAt.getTime() - (i + 1) * 1000),
      });
    }
    const trigger = await makeEvent({
      applicationId: app.id,
      eventType: 'LOGIN_FAILED',
      ipAddress: IP,
      timestamp: ingestedAt,
      createdAt: ingestedAt,
    });

    const match = await bruteForceRule.evaluate(trigger, prisma);

    expect(match).not.toBeNull();
  });
});

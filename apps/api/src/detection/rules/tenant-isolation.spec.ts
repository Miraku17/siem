// Correlation must never cross an application boundary.
//
// Two failure modes, one root cause (queries not scoped by applicationId):
//   - threshold rules over-count, firing on activity the tenant never saw;
//   - novelty ("never seen before") rules are wrongly suppressed by another
//     tenant's history, silently losing real detections.
import { SecurityEvent } from '@prisma/client';
import { DetectionRule } from '../detection-rule.interface';
import { bruteForceSuccessRule } from './brute-force-success.rule';
import { mfaFatigueRule } from './mfa-fatigue.rule';
import { massExportRule } from './mass-export.rule';
import { massUserRemovalRule } from './mass-user-removal.rule';
import { mfaResetTakeoverRule } from './mfa-reset-takeover.rule';
import { newIpRule } from './new-ip.rule';
import { newCountryRule } from './new-country.rule';
import { takeoverChainRule } from './takeover-chain.rule';
import { prisma, resetDb, disconnect, makeApp, makeEvent } from '../../../test/db';

beforeEach(resetDb);
afterAll(disconnect);

const IP = '198.51.100.7';
const OTHER_IP = '198.51.100.250';
const USER = 'usr_shared_id';

type Build = (appId: string, base: Date) => Promise<unknown>;
type Trigger = (appId: string, base: Date) => Promise<SecurityEvent>;

// ── Threshold rules: history in another tenant must not count ──────────────

const thresholdCases: {
  rule: DetectionRule;
  history: Build;
  trigger: Trigger;
}[] = [
  {
    rule: bruteForceSuccessRule,
    history: async (appId, base) => {
      for (let i = 0; i < 5; i++) {
        await makeEvent({
          applicationId: appId,
          eventType: 'LOGIN_FAILED',
          ipAddress: IP,
          createdAt: new Date(base.getTime() - (i + 1) * 1000),
        });
      }
    },
    trigger: (appId, base) =>
      makeEvent({
        applicationId: appId,
        eventType: 'LOGIN_SUCCESS',
        ipAddress: IP,
        userId: USER,
        createdAt: base,
      }),
  },
  {
    rule: mfaFatigueRule,
    history: async (appId, base) => {
      for (let i = 0; i < 4; i++) {
        await makeEvent({
          applicationId: appId,
          eventType: 'MFA_FAILED',
          userId: USER,
          createdAt: new Date(base.getTime() - (i + 1) * 1000),
        });
      }
    },
    trigger: (appId, base) =>
      makeEvent({
        applicationId: appId,
        eventType: 'MFA_FAILED',
        userId: USER,
        createdAt: base,
      }),
  },
  {
    rule: massExportRule,
    history: async (appId, base) => {
      for (let i = 0; i < 4; i++) {
        await makeEvent({
          applicationId: appId,
          eventType: 'DATA_EXPORT',
          userId: USER,
          createdAt: new Date(base.getTime() - (i + 1) * 1000),
        });
      }
    },
    trigger: (appId, base) =>
      makeEvent({
        applicationId: appId,
        eventType: 'DATA_EXPORT',
        userId: USER,
        createdAt: base,
      }),
  },
  {
    rule: massUserRemovalRule,
    history: async (appId, base) => {
      for (let i = 0; i < 2; i++) {
        await makeEvent({
          applicationId: appId,
          eventType: 'USER_DELETED',
          userId: USER,
          createdAt: new Date(base.getTime() - (i + 1) * 1000),
        });
      }
    },
    trigger: (appId, base) =>
      makeEvent({
        applicationId: appId,
        eventType: 'USER_DELETED',
        userId: USER,
        createdAt: base,
      }),
  },
  {
    rule: mfaResetTakeoverRule,
    history: (appId, base) =>
      makeEvent({
        applicationId: appId,
        eventType: 'ADMIN_MFA_RESET',
        userId: 'usr_admin',
        createdAt: new Date(base.getTime() - 60_000),
        metadata: { targetUserId: USER },
      }),
    trigger: (appId, base) =>
      makeEvent({
        applicationId: appId,
        eventType: 'LOGIN_SUCCESS',
        userId: USER,
        ipAddress: IP,
        createdAt: base,
      }),
  },
];

describe.each(thresholdCases)('$rule.id (threshold)', ({ rule, history, trigger }) => {
  it('fires on its own tenant history', async () => {
    const app = await makeApp();
    const base = new Date();
    await history(app.id, base);
    const event = await trigger(app.id, base);

    expect(await rule.evaluate(event, prisma)).not.toBeNull();
  });

  it('ignores identical history belonging to another tenant', async () => {
    const victim = await makeApp();
    const other = await makeApp();
    const base = new Date();
    await history(other.id, base);
    const event = await trigger(victim.id, base);

    expect(await rule.evaluate(event, prisma)).toBeNull();
  });
});

// ── Novelty rules: another tenant's history must not suppress ──────────────

const noveltyCases: {
  rule: DetectionRule;
  // Baseline history the victim tenant needs for the rule to be applicable.
  baseline: Build;
  // The history that, if visible, makes the trigger look "already seen".
  suppressing: Build;
  trigger: Trigger;
}[] = [
  {
    rule: newIpRule,
    baseline: (appId, base) =>
      makeEvent({
        applicationId: appId,
        eventType: 'LOGIN_SUCCESS',
        userId: USER,
        ipAddress: OTHER_IP,
        timestamp: new Date(base.getTime() - 86_400_000),
        createdAt: new Date(base.getTime() - 86_400_000),
      }),
    suppressing: (appId, base) =>
      makeEvent({
        applicationId: appId,
        eventType: 'LOGIN_SUCCESS',
        userId: USER,
        ipAddress: IP,
        timestamp: new Date(base.getTime() - 172_800_000),
        createdAt: new Date(base.getTime() - 172_800_000),
      }),
    trigger: (appId, base) =>
      makeEvent({
        applicationId: appId,
        eventType: 'LOGIN_SUCCESS',
        userId: USER,
        ipAddress: IP,
        timestamp: base,
        createdAt: base,
      }),
  },
  {
    rule: newCountryRule,
    baseline: (appId, base) =>
      makeEvent({
        applicationId: appId,
        eventType: 'LOGIN_SUCCESS',
        userId: USER,
        ipAddress: OTHER_IP,
        timestamp: new Date(base.getTime() - 86_400_000),
        createdAt: new Date(base.getTime() - 86_400_000),
        metadata: { country: 'Philippines' },
      }),
    suppressing: (appId, base) =>
      makeEvent({
        applicationId: appId,
        eventType: 'LOGIN_SUCCESS',
        userId: USER,
        ipAddress: IP,
        timestamp: new Date(base.getTime() - 172_800_000),
        createdAt: new Date(base.getTime() - 172_800_000),
        metadata: { country: 'Germany' },
      }),
    trigger: (appId, base) =>
      makeEvent({
        applicationId: appId,
        eventType: 'LOGIN_SUCCESS',
        userId: USER,
        ipAddress: IP,
        timestamp: base,
        createdAt: base,
        metadata: { country: 'Germany' },
      }),
  },
  {
    rule: takeoverChainRule,
    baseline: (appId, base) =>
      makeEvent({
        applicationId: appId,
        eventType: 'PASSWORD_RESET',
        userId: USER,
        ipAddress: OTHER_IP,
        timestamp: new Date(base.getTime() - 3600_000),
        createdAt: new Date(base.getTime() - 3600_000),
      }),
    suppressing: (appId, base) =>
      makeEvent({
        applicationId: appId,
        eventType: 'LOGIN_SUCCESS',
        userId: USER,
        ipAddress: IP,
        timestamp: new Date(base.getTime() - 172_800_000),
        createdAt: new Date(base.getTime() - 172_800_000),
      }),
    trigger: (appId, base) =>
      makeEvent({
        applicationId: appId,
        eventType: 'LOGIN_SUCCESS',
        userId: USER,
        ipAddress: IP,
        timestamp: base,
        createdAt: base,
      }),
  },
];

describe.each(noveltyCases)(
  '$rule.id (novelty)',
  ({ rule, baseline, suppressing, trigger }) => {
    it('fires when the tenant has never seen this before', async () => {
      const app = await makeApp();
      const base = new Date();
      await baseline(app.id, base);
      const event = await trigger(app.id, base);

      expect(await rule.evaluate(event, prisma)).not.toBeNull();
    });

    it('stays silent when its own tenant has seen it before', async () => {
      const app = await makeApp();
      const base = new Date();
      await baseline(app.id, base);
      await suppressing(app.id, base);
      const event = await trigger(app.id, base);

      expect(await rule.evaluate(event, prisma)).toBeNull();
    });

    it('is not suppressed by another tenant having seen it', async () => {
      const victim = await makeApp();
      const other = await makeApp();
      const base = new Date();
      await baseline(victim.id, base);
      await suppressing(other.id, base);
      const event = await trigger(victim.id, base);

      expect(await rule.evaluate(event, prisma)).not.toBeNull();
    });
  },
);

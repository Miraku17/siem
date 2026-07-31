// The enrichment pipeline decides an event's country and threat score. A source
// application must not be able to dictate either — those fields drive
// `auth.new_country` and `intel.malicious_ip`, so a compromised or malicious
// sender could otherwise silence its own detections.
jest.mock('./geoip');
jest.mock('./threat-intel');

import { PrismaClient } from '@prisma/client';
import { EventsService } from './events.service';
import { DetectionService } from '../detection/detection.service';
import { lookupGeo } from './geoip';
import { lookupThreat } from './threat-intel';
import { prisma, resetDb, disconnect, makeApp } from '../../test/db';

const db = prisma as unknown as PrismaClient;
const service = new EventsService(prisma, new DetectionService(prisma));

const mockGeo = lookupGeo as jest.MockedFunction<typeof lookupGeo>;
const mockThreat = lookupThreat as jest.MockedFunction<typeof lookupThreat>;

beforeEach(async () => {
  await resetDb();
  mockGeo.mockReset();
  mockThreat.mockReset();
  mockGeo.mockResolvedValue({});
  mockThreat.mockResolvedValue({});
});
afterAll(disconnect);

const base = {
  application: 'whatever',
  event: 'LOGIN_SUCCESS',
  ip: '203.0.113.10',
};

async function storedMetadata(id: string) {
  const row = await db.securityEvent.findUniqueOrThrow({ where: { id } });
  return row.metadata as Record<string, any>;
}

describe('EventsService.ingest enrichment trust', () => {
  it('overrides a source-claimed country with the resolved one', async () => {
    mockGeo.mockResolvedValue({ country: 'Germany', countryCode: 'DE' });
    const app = await makeApp();

    const event = await service.ingest(
      { ...base, metadata: { country: 'Philippines' } } as any,
      app.id,
    );

    expect((await storedMetadata(event.id)).country).toBe('Germany');
  });

  it('discards a source-supplied threat verdict', async () => {
    mockThreat.mockResolvedValue({ score: 92, listed: true, source: 'abuseipdb' });
    const app = await makeApp();

    const event = await service.ingest(
      { ...base, metadata: { threat: { score: 0, listed: false } } } as any,
      app.id,
    );

    const meta = await storedMetadata(event.id);
    expect(meta.threat.score).toBe(92);
    expect(meta.threat.listed).toBe(true);
  });

  it('drops a forged threat verdict even when enrichment has no opinion', async () => {
    mockThreat.mockResolvedValue({});
    const app = await makeApp();

    const event = await service.ingest(
      { ...base, metadata: { threat: { score: 100, listed: true } } } as any,
      app.id,
    );

    expect((await storedMetadata(event.id)).threat).toBeUndefined();
  });

  it('keeps source metadata that enrichment does not own', async () => {
    mockGeo.mockResolvedValue({ country: 'Germany' });
    const app = await makeApp();

    const event = await service.ingest(
      { ...base, metadata: { device: 'Windows', businessId: 'biz_1' } } as any,
      app.id,
    );

    const meta = await storedMetadata(event.id);
    expect(meta.device).toBe('Windows');
    expect(meta.businessId).toBe('biz_1');
    expect(meta.country).toBe('Germany');
  });

  it('falls back to the source country when geo cannot resolve the IP', async () => {
    mockGeo.mockResolvedValue({});
    const app = await makeApp();

    const event = await service.ingest(
      { ...base, ip: '10.0.0.5', metadata: { country: 'Philippines' } } as any,
      app.id,
    );

    expect((await storedMetadata(event.id)).country).toBe('Philippines');
  });
});

import { PrismaClient } from '@prisma/client';
import { ApplicationsService } from './applications.service';
import { hashApiKey } from '../auth/api-key.util';
import { prisma, resetDb, disconnect } from '../../test/db';

const db = prisma as unknown as PrismaClient;
const service = new ApplicationsService(prisma);

beforeEach(resetDb);
afterAll(disconnect);

describe('ApplicationsService.register', () => {
  it('returns the plaintext key exactly once, at registration', async () => {
    const created = await service.register('Bedrock 360', 'bedrock-360');

    expect(created.apiKey).toMatch(/^sk_live_[0-9a-f]{48}$/);
  });

  it('persists only the hash of the issued key', async () => {
    const created = await service.register('Bedrock 360', 'bedrock-360');

    const row = await db.application.findUniqueOrThrow({
      where: { slug: 'bedrock-360' },
    });
    expect(row.apiKeyHash).toBe(hashApiKey(created.apiKey));
    expect(JSON.stringify(row)).not.toContain(created.apiKey);
  });

  it('never exposes a key when listing applications', async () => {
    const created = await service.register('Bedrock 360', 'bedrock-360');

    const listed = await service.findAll();
    expect(JSON.stringify(listed)).not.toContain(created.apiKey);
    expect(listed[0].keyPrefix).toBe(created.apiKey.slice(0, 16));
  });

  it('does not ship the stored hash to the dashboard', async () => {
    const created = await service.register('Bedrock 360', 'bedrock-360');

    const listed = await service.findAll();
    expect(JSON.stringify(listed)).not.toContain(hashApiKey(created.apiKey));
    expect(listed[0]).not.toHaveProperty('apiKeyHash');
  });
});

// The ingestion API key is the only thing standing between the internet and
// the event stream. It must be verifiable without the database holding
// anything that could be replayed as a credential.
import { ExecutionContext } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ApiKeyGuard } from './api-key.guard';
import { generateApiKey, hashApiKey, keyPrefixOf } from './api-key.util';
import { prisma, resetDb, disconnect } from '../../test/db';

const db = prisma as unknown as PrismaClient;
const guard = new ApiKeyGuard(prisma);

beforeEach(resetDb);
afterAll(disconnect);

// Minimal stand-in for the Nest execution context: the guard only reads headers
// and writes applicationId back onto the request.
function contextFor(authorization?: string) {
  const req: Record<string, any> = {
    headers: authorization ? { authorization } : {},
  };
  return {
    req,
    ctx: {
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext,
  };
}

async function registerApp(status: 'ACTIVE' | 'DISABLED' = 'ACTIVE') {
  const apiKey = generateApiKey();
  const app = await db.application.create({
    data: {
      name: 'Bedrock',
      slug: `bedrock-${Date.now()}-${Math.random()}`,
      apiKeyHash: hashApiKey(apiKey),
      keyPrefix: keyPrefixOf(apiKey),
      status,
    },
  });
  return { app, apiKey };
}

describe('ApiKeyGuard', () => {
  it('accepts the plaintext key issued at registration', async () => {
    const { app, apiKey } = await registerApp();
    const { req, ctx } = contextFor(`Bearer ${apiKey}`);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.applicationId).toBe(app.id);
  });

  it('stores no value that can be replayed as the key', async () => {
    const { apiKey } = await registerApp();

    const rows = await db.application.findMany();
    expect(JSON.stringify(rows)).not.toContain(apiKey);
  });

  it('rejects an unknown key', async () => {
    await registerApp();
    const { ctx } = contextFor(`Bearer ${generateApiKey()}`);

    await expect(guard.canActivate(ctx)).rejects.toThrow(/Invalid API key/);
  });

  it('rejects the stored hash presented as if it were the key', async () => {
    const { app } = await registerApp();
    const { ctx } = contextFor(`Bearer ${app.apiKeyHash}`);

    await expect(guard.canActivate(ctx)).rejects.toThrow(/Invalid API key/);
  });

  it('rejects a disabled application', async () => {
    const { apiKey } = await registerApp('DISABLED');
    const { ctx } = contextFor(`Bearer ${apiKey}`);

    await expect(guard.canActivate(ctx)).rejects.toThrow(/Invalid API key/);
  });

  it('rejects a request with no Authorization header', async () => {
    const { ctx } = contextFor();

    await expect(guard.canActivate(ctx)).rejects.toThrow(/Missing API key/);
  });
});

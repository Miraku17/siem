import type { IncomingMessage, ServerResponse } from 'http';

// Vercel serverless entrypoint. All requests are rewritten here (see vercel.json)
// and handed to the underlying Express instance, so Nest's global `api/v1`
// prefix and routing still apply.
//
// We require the *compiled* app (dist/, produced by `nest build` = tsc) rather
// than importing src directly: Vercel builds this file with esbuild, which does
// NOT emit the decorator metadata Nest's DI relies on. tsc does.
let cachedServer: ((req: IncomingMessage, res: ServerResponse) => void) | null =
  null;

async function getServer() {
  if (!cachedServer) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createApp } = require('../dist/create-app');
    const app = await createApp();
    await app.init();
    cachedServer = app.getHttpAdapter().getInstance();
  }
  return cachedServer!;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const server = await getServer();
  server(req, res);
}

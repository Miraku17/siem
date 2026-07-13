import { createApp } from './create-app';

// Local / long-running server (npm run start:dev, node dist/main). On serverless
// (Vercel) the entrypoint is api/index.ts instead, which never calls listen().
async function bootstrap() {
  const app = await createApp();

  const port = process.env.PORT ?? process.env.API_PORT ?? 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`SIEM API listening on http://localhost:${port}/api/v1`);
}

bootstrap();

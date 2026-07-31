// Loads .env.test BEFORE any module reads process.env, so tests never pick up
// the developer's .env (which points at the deployed Neon database).
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.test'), override: true });

if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? '')) {
  throw new Error(
    `Refusing to run tests against a non-local database: ${process.env.DATABASE_URL}`,
  );
}

import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { hashPassword } from '../src/auth/password.util';
import { generateApiKey, hashApiKey, keyPrefixOf } from '../src/auth/api-key.util';

const prisma = new PrismaClient();

// Issues a key and prints it once — the database only ever sees the digest, so
// re-running the seed will NOT reprint the key of an application that already
// exists. Rotate by deleting the row and re-seeding.
async function upsertApplication(name: string, slug: string) {
  const existing = await prisma.application.findUnique({ where: { slug } });
  if (existing) return { slug, apiKey: null };

  const apiKey = generateApiKey();
  await prisma.application.create({
    data: {
      name,
      slug,
      apiKeyHash: hashApiKey(apiKey),
      keyPrefix: keyPrefixOf(apiKey),
    },
  });
  return { slug, apiKey };
}

async function main() {
  // ── Source applications ────────────────────────────────────
  const velocity = await upsertApplication(
    'Velocity Pickleball',
    'velocity-pickleball',
  );
  const bedrock = await upsertApplication('Bedrock 360', 'bedrock-360');

  // ── Dashboard admin user ───────────────────────────────────
  // No hardcoded default: set SEED_ADMIN_PASSWORD, or take the generated one
  // printed below. The old fixed `admin1234` shipped to production.
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@siem.local';
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD ?? randomBytes(12).toString('base64url');
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: await hashPassword(adminPassword),
        role: 'ADMIN',
      },
    });
  }

  const keyLine = (a: { slug: string; apiKey: string | null }) =>
    `  ${a.slug}  →  ${a.apiKey ?? '(already registered — key not recoverable)'}`;

  // eslint-disable-next-line no-console
  console.log(
    [
      'Seeded applications (keys are shown once and stored only as a hash):',
      keyLine(velocity),
      keyLine(bedrock),
      '',
      'Dashboard login:',
      `  email:    ${adminEmail}`,
      existingAdmin
        ? '  password: (unchanged — user already existed)'
        : `  password: ${adminPassword}`,
    ].join('\n'),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

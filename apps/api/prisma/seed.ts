import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { hashPassword } from '../src/auth/password.util';

const prisma = new PrismaClient();

async function main() {
  // ── Source applications ────────────────────────────────────
  const velocity = await prisma.application.upsert({
    where: { slug: 'velocity-pickleball' },
    update: {},
    create: {
      name: 'Velocity Pickleball',
      slug: 'velocity-pickleball',
      apiKey: `sk_live_${randomBytes(24).toString('hex')}`,
    },
  });

  const bedrock = await prisma.application.upsert({
    where: { slug: 'bedrock-360' },
    update: {},
    create: {
      name: 'Bedrock 360',
      slug: 'bedrock-360',
      apiKey: `sk_live_${randomBytes(24).toString('hex')}`,
    },
  });

  // ── Dashboard admin user ───────────────────────────────────
  const adminEmail = 'admin@siem.local';
  const adminPassword = 'admin1234';
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: await hashPassword(adminPassword),
      role: 'ADMIN',
    },
  });

  // eslint-disable-next-line no-console
  console.log(
    [
      'Seeded applications:',
      `  ${velocity.slug}  →  ${velocity.apiKey}`,
      `  ${bedrock.slug}  →  ${bedrock.apiKey}`,
      '',
      'Dashboard login:',
      `  email:    ${adminEmail}`,
      `  password: ${adminPassword}`,
    ].join('\n'),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

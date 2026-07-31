// Single source of truth for the dashboard JWT signing key.
//
// This used to be `process.env.JWT_SECRET ?? 'change-me'` at the module level,
// which meant a deployment that forgot the variable would boot happily and sign
// tokens with a value published in this repository — anyone could forge an
// ADMIN token. It also disagreed with JwtGuard, which verified against the raw
// (possibly undefined) env var. Fail loudly instead, at startup.

const PLACEHOLDERS = new Set(['change-me', 'changeme', 'secret', 'test']);
const MIN_LENGTH = 16;

export function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error(
      'JWT_SECRET is not set. Generate one with `openssl rand -hex 32` and set it in the environment.',
    );
  }
  if (PLACEHOLDERS.has(secret.toLowerCase())) {
    throw new Error(
      `JWT_SECRET is set to the placeholder "${secret}". Generate a real one with \`openssl rand -hex 32\`.`,
    );
  }
  if (secret.length < MIN_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${MIN_LENGTH} characters (got ${secret.length}). Generate one with \`openssl rand -hex 32\`.`,
    );
  }

  return secret;
}

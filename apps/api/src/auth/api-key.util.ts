import { createHash, randomBytes } from 'crypto';

// Ingestion API keys are bearer credentials, so the database stores only a
// digest. SHA-256 (not scrypt/bcrypt) is the right choice here: the key is 192
// bits of randomness we generated ourselves, not a human-chosen password, so
// there is nothing to brute-force and every ingest request would otherwise pay
// a deliberate KDF cost.

const KEY_BYTES = 24; // 48 hex chars
const PREFIX_LENGTH = 16; // "sk_live_" + 8 hex chars

export function generateApiKey(): string {
  return `sk_live_${randomBytes(KEY_BYTES).toString('hex')}`;
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key, 'utf8').digest('hex');
}

// Shown in the dashboard so an analyst can tell two keys apart. Short enough
// that it leaks no useful fraction of the secret.
export function keyPrefixOf(key: string): string {
  return key.slice(0, PREFIX_LENGTH);
}

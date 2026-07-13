import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);
const KEY_LEN = 64;

// Password hashing via Node's built-in scrypt — no native/3rd-party dependency.
// Stored format: "<salt-hex>:<derived-key-hex>".
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const keyBuf = Buffer.from(key, 'hex');
  const derived = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  return keyBuf.length === derived.length && timingSafeEqual(keyBuf, derived);
}

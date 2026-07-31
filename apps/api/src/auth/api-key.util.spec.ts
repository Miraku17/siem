import { generateApiKey, hashApiKey, keyPrefixOf } from './api-key.util';

describe('api key utilities', () => {
  it('issues keys with the sk_live_ prefix', () => {
    expect(generateApiKey()).toMatch(/^sk_live_[0-9a-f]{48}$/);
  });

  it('issues a different key every time', () => {
    const keys = new Set(Array.from({ length: 50 }, generateApiKey));
    expect(keys.size).toBe(50);
  });

  it('hashes to a stable sha256 hex digest', () => {
    expect(hashApiKey('sk_live_deadbeefcafe1234567890')).toBe(
      '4b18f39e64b9c8f85ba0de7ed4fdaa5ff4f0fe991b1bbb48fb66c2b5647b94e3',
    );
  });

  it('never returns the key itself as its hash', () => {
    const key = generateApiKey();
    expect(hashApiKey(key)).not.toBe(key);
  });

  it('derives a display prefix short enough to be non-recoverable', () => {
    const key = 'sk_live_a1b2c3d4e5f6a7b8c9d0';
    expect(keyPrefixOf(key)).toBe('sk_live_a1b2c3d4');
    expect(key.startsWith(keyPrefixOf(key))).toBe(true);
  });
});

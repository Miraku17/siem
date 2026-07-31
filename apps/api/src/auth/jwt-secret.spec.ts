// A missing JWT_SECRET must stop the process, not silently fall back to a
// well-known constant — a predictable signing key lets anyone mint an ADMIN
// token for the dashboard.
import { requireJwtSecret } from './jwt-secret';

const original = process.env.JWT_SECRET;
afterEach(() => {
  process.env.JWT_SECRET = original;
});

describe('requireJwtSecret', () => {
  it('returns the configured secret', () => {
    process.env.JWT_SECRET = 'a-real-secret-value-long-enough';
    expect(requireJwtSecret()).toBe('a-real-secret-value-long-enough');
  });

  it('throws when JWT_SECRET is unset', () => {
    delete process.env.JWT_SECRET;
    expect(() => requireJwtSecret()).toThrow(/JWT_SECRET/);
  });

  it('throws when JWT_SECRET is empty', () => {
    process.env.JWT_SECRET = '   ';
    expect(() => requireJwtSecret()).toThrow(/JWT_SECRET/);
  });

  it('rejects the placeholder value that shipped as the fallback', () => {
    process.env.JWT_SECRET = 'change-me';
    expect(() => requireJwtSecret()).toThrow(/JWT_SECRET/);
  });

  it('rejects a secret too short to be worth signing with', () => {
    process.env.JWT_SECRET = 'short';
    expect(() => requireJwtSecret()).toThrow(/JWT_SECRET/);
  });
});

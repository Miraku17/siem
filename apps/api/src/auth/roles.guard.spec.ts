// UserRole existed in the schema and rode along in the JWT, but nothing ever
// read it — a VIEWER could mutate alerts and register applications (which mints
// a live ingestion key). These tests pin the guard that closes that.
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

class TestController {
  @Roles('ADMIN')
  adminOnly() {}

  @Roles('ADMIN', 'ANALYST')
  analystOrAdmin() {}

  // No decorator — any authenticated user may read.
  openToAnyone() {}
}

const guard = new RolesGuard(new Reflector());

function contextFor(
  handler: keyof TestController,
  user?: { role: string },
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => TestController.prototype[handler],
    getClass: () => TestController,
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows a role the route lists', () => {
    expect(guard.canActivate(contextFor('adminOnly', { role: 'ADMIN' }))).toBe(true);
  });

  it('allows any of several listed roles', () => {
    expect(
      guard.canActivate(contextFor('analystOrAdmin', { role: 'ANALYST' })),
    ).toBe(true);
  });

  it('blocks a VIEWER from an analyst route', () => {
    expect(() =>
      guard.canActivate(contextFor('analystOrAdmin', { role: 'VIEWER' })),
    ).toThrow(/permission/i);
  });

  it('blocks an ANALYST from an admin route', () => {
    expect(() =>
      guard.canActivate(contextFor('adminOnly', { role: 'ANALYST' })),
    ).toThrow(/permission/i);
  });

  it('leaves undecorated routes open to any authenticated user', () => {
    expect(guard.canActivate(contextFor('openToAnyone', { role: 'VIEWER' }))).toBe(
      true,
    );
  });

  it('blocks a restricted route when no user is attached', () => {
    expect(() => guard.canActivate(contextFor('adminOnly'))).toThrow(/permission/i);
  });

  it('blocks an unrecognised role', () => {
    expect(() =>
      guard.canActivate(contextFor('adminOnly', { role: 'SUPERUSER' })),
    ).toThrow(/permission/i);
  });
});

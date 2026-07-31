import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

// Enforces @Roles() on top of JwtGuard, which has already put the token payload
// on the request. Routes without @Roles() stay readable by any authenticated
// user; anything that mutates state or issues credentials must declare a role.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const role = req.user?.role as UserRole | undefined;

    if (!role || !required.includes(role)) {
      throw new ForbiddenException(
        `Your role does not have permission for this action (requires ${required.join(' or ')}).`,
      );
    }
    return true;
  }
}

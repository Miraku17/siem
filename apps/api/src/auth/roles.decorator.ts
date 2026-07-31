import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'siem:roles';

// Restricts a route to the listed dashboard roles. Without it a route is open
// to any authenticated user (read-only views).
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

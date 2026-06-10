import { SetMetadata } from '@nestjs/common';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ROLES_KEY       = 'roles';
export const PERMISSIONS_KEY = 'permissions';

/** Restrict endpoint to specific roles */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/** Restrict endpoint to users with specific permission (checks role + user override) */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/** Get current authenticated user from request */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

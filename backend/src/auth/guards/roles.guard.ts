import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, PERMISSIONS_KEY } from '../decorators/roles.decorator';

/**
 * RolesGuard — checks:
 * 1. Required ROLE (via @Roles decorator)
 * 2. Required PERMISSION (via @RequirePermissions decorator)
 * 3. Direct user_permissions override (per PDF spec)
 *
 * PDF spec: user_permissions allow granting specific permissions
 * directly to a user without changing their role.
 * Example: EMPLOYEE + report:view (override) → can see reports
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return false;

    // Get required roles from @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(), context.getClass(),
    ]);

    // Get required permissions from @RequirePermissions() decorator
    const requiredPerms = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(), context.getClass(),
    ]);

    // If no restrictions set → allow all authenticated users
    if (!requiredRoles?.length && !requiredPerms?.length) return true;

    // ── Get user's effective roles ─────────────────────────
    const userRoles: string[] = user.userRoles?.map((ur: any) => ur.role?.name) || [];

    // SYSTEM_ADMIN bypasses all checks
    if (userRoles.includes('SYSTEM_ADMIN')) return true;

    // ── Check roles ────────────────────────────────────────
    if (requiredRoles?.length) {
      const hasRole = requiredRoles.some(r => userRoles.includes(r));
      if (!hasRole) {
        // Check user_permissions override (PDF spec)
        if (requiredPerms?.length) {
          return this.checkPermissions(user, requiredPerms);
        }
        throw new ForbiddenException(
          `Access denied. Required role: ${requiredRoles.join(' or ')}`
        );
      }
    }

    // ── Check permissions (if specified) ──────────────────
    if (requiredPerms?.length) {
      return this.checkPermissions(user, requiredPerms);
    }

    return true;
  }

  /**
   * Check if user has permission via:
   * 1. Role-based permissions (role_permissions table)
   * 2. Direct user override (user_permissions table — PDF spec override feature)
   */
  private checkPermissions(user: any, requiredPerms: string[]): boolean {
    // Get permissions from role_permissions
    const rolePerms: string[] = [];
    for (const ur of (user.userRoles || [])) {
      const perms = (ur.role?.rolePermissions as any[])?.map((rp: any) => rp.permission?.action) || [];
      rolePerms.push(...perms);
    }

    // Get direct user_permissions (override — can be granted OR denied)
    const directPerms: string[] = [];
    const deniedPerms: string[] = [];
    for (const up of (user.userPermissions || [])) {
      if (up.granted === true)  directPerms.push(up.permission?.action);
      if (up.granted === false) deniedPerms.push(up.permission?.action); // explicit deny
    }

    const hasPermission = requiredPerms.every(perm => {
      if (deniedPerms.includes(perm)) return false;       // explicitly denied
      if (directPerms.includes(perm)) return true;        // directly granted (override)
      return rolePerms.includes(perm);                    // via role
    });

    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied. Required permission: ${requiredPerms.join(', ')}`
      );
    }
    return true;
  }
}

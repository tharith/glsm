import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>('permissions', [ctx.getHandler(), ctx.getClass()]);
    if (!required || required.length === 0) return true;
    const user = ctx.switchToHttp().getRequest().user;
    const rolePerms = user?.userRoles?.flatMap((ur: any) => ur.role.rolePermissions?.map((rp: any) => rp.permission.action) || []) || [];
    const granted = user?.userPermissions?.filter((up: any) => up.granted).map((up: any) => up.permission.action) || [];
    const denied  = user?.userPermissions?.filter((up: any) => !up.granted).map((up: any) => up.permission.action) || [];
    const effective = [...new Set([...rolePerms, ...granted])].filter(p => !denied.includes(p));
    return required.every(p => effective.includes(p));
  }
}

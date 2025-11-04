// src/guards/role.guard.ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Role } from '@prisma/client'

const roleHierarchy = new Map<Role, number>([
  [Role.CLIENT, 0],
  [Role.WAREHOUSE_WORKER, 1],
  [Role.LOGIST, 2],
  [Role.ACCOUNTANT, 2],
  [Role.MANAGER, 3],
  [Role.ADMIN, 4],
]);

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRole = this.reflector.get<Role>('roles', context.getHandler());
    if (!requiredRole) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      throw new ForbiddenException('User role not found.');
    }

    const userLevel = roleHierarchy.get(user.role);
    const requiredLevel = roleHierarchy.get(requiredRole);

    if (userLevel === undefined || requiredLevel === undefined) {
      throw new ForbiddenException('Role hierarchy configuration error.');
    }

    return userLevel >= requiredLevel;
  }
}

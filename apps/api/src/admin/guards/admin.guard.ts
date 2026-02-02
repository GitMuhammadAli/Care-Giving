import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemRole } from '@prisma/client';
import { SYSTEM_ROLES_KEY } from '../decorators/system-roles.decorator';

/**
 * AdminGuard - Checks if the user has the required system admin role
 * 
 * By default, requires ADMIN or SUPER_ADMIN role.
 * Can be customized with @SystemRoles decorator to specify exact roles.
 * 
 * Usage:
 * @UseGuards(JwtAuthGuard, AdminGuard)
 * @SystemRoles(SystemRole.SUPER_ADMIN) // Optional: specify exact roles
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip for non-HTTP contexts (RabbitMQ, WebSocket, etc.)
    if (context.getType() !== 'http') {
      return true;
    }

    // Get required roles from decorator, default to ADMIN and SUPER_ADMIN
    const requiredRoles = this.reflector.getAllAndOverride<SystemRole[]>(
      SYSTEM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    ) || [SystemRole.ADMIN, SystemRole.SUPER_ADMIN];

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const userSystemRole = user.systemRole as SystemRole;

    // Check if user has any of the required system roles
    const hasRole = requiredRoles.includes(userSystemRole);

    if (!hasRole) {
      throw new ForbiddenException(
        'Access denied. Admin privileges required.',
      );
    }

    return true;
  }
}


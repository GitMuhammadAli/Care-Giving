import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { SystemRole } from '@prisma/client';

/**
 * SuperAdminGuard - Checks if the user has SUPER_ADMIN role
 * 
 * Use this for system-critical operations like:
 * - Modifying system configuration
 * - Managing other admin accounts
 * - Accessing sensitive system data
 * 
 * Usage:
 * @UseGuards(JwtAuthGuard, SuperAdminGuard)
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Skip for non-HTTP contexts
    if (context.getType() !== 'http') {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (user.systemRole !== SystemRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Access denied. Super Admin privileges required.',
      );
    }

    return true;
  }
}


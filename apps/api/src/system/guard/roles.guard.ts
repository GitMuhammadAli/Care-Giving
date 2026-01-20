import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, FamilyRole } from '../decorator/roles.decorator';

/**
 * RolesGuard - Checks if the user has the required family role
 * 
 * This guard should be used AFTER FamilyAccessGuard, which attaches
 * the familyMember to the request.
 * 
 * Usage:
 * @UseGuards(JwtAuthGuard, FamilyAccessGuard, RolesGuard)
 * @FamilyAccess({ param: 'familyId' })
 * @Roles(FamilyRole.ADMIN)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip for non-HTTP contexts (RabbitMQ, WebSocket, etc.)
    if (context.getType() !== 'http') {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<FamilyRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles specified, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const familyMember = request.familyMember;

    // If no family member attached, FamilyAccessGuard should have blocked this
    if (!familyMember) {
      throw new ForbiddenException('Family membership required');
    }

    // Check if user has any of the required roles
    const hasRole = requiredRoles.includes(familyMember.role as FamilyRole);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required role: ${requiredRoles.join(' or ')}`,
      );
    }

    return true;
  }
}


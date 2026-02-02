import { SetMetadata } from '@nestjs/common';
import { SystemRole } from '@prisma/client';

export const SYSTEM_ROLES_KEY = 'systemRoles';

/**
 * SystemRoles decorator for specifying required system-wide admin roles
 * Works with AdminGuard to check if user has the specified system role
 * 
 * @example
 * // Only super admins can access
 * @SystemRoles(SystemRole.SUPER_ADMIN)
 * 
 * @example
 * // Any admin level can access
 * @SystemRoles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)
 * 
 * @example
 * // Moderators and above can access
 * @SystemRoles(SystemRole.MODERATOR, SystemRole.ADMIN, SystemRole.SUPER_ADMIN)
 */
export const SystemRoles = (...roles: SystemRole[]) =>
  SetMetadata(SYSTEM_ROLES_KEY, roles);

/**
 * Convenience decorator for admin-only routes (ADMIN or SUPER_ADMIN)
 */
export const AdminOnly = () =>
  SetMetadata(SYSTEM_ROLES_KEY, [SystemRole.ADMIN, SystemRole.SUPER_ADMIN]);

/**
 * Convenience decorator for super admin-only routes
 */
export const SuperAdminOnly = () =>
  SetMetadata(SYSTEM_ROLES_KEY, [SystemRole.SUPER_ADMIN]);

/**
 * Convenience decorator for moderator and above routes
 */
export const ModeratorOnly = () =>
  SetMetadata(SYSTEM_ROLES_KEY, [SystemRole.MODERATOR, SystemRole.ADMIN, SystemRole.SUPER_ADMIN]);


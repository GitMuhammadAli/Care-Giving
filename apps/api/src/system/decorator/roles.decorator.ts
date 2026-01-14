import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Family member roles
export enum FamilyRole {
  ADMIN = 'ADMIN',
  CAREGIVER = 'CAREGIVER',
  VIEWER = 'VIEWER',
}

/**
 * Roles decorator for specifying required family roles
 * Works with FamilyAccessGuard to check if user has the specified role in a family
 * 
 * @example
 * // Only admins can access
 * @Roles(FamilyRole.ADMIN)
 * 
 * @example
 * // Admins or caregivers can access
 * @Roles(FamilyRole.ADMIN, FamilyRole.CAREGIVER)
 */
export const Roles = (...roles: FamilyRole[]) => 
  SetMetadata(ROLES_KEY, roles);


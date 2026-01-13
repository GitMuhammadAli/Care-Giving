import { SetMetadata } from '@nestjs/common';

export const FAMILY_ACCESS_KEY = 'familyAccess';
export const FAMILY_PARAM_KEY = 'familyParam';

export interface FamilyAccessOptions {
  param?: string;
  roles?: string[];
}

export const FamilyAccess = (options: FamilyAccessOptions = {}) =>
  SetMetadata(FAMILY_ACCESS_KEY, {
    param: options.param || 'familyId',
    roles: options.roles || [],
  });


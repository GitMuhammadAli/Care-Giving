import { ClsService } from 'nestjs-cls';
import { Injectable } from '@nestjs/common';

export interface UserContext {
  id: string;
  email: string;
  name?: string;
  fullName?: string;
  role?: string;
  permissions?: string[];
  familyIds?: string[];
}

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  permissions: string[];
  familyIds: string[];
}

@Injectable()
export class ContextHelper {
  private static clsService: ClsService;

  static setClsService(clsService: ClsService) {
    ContextHelper.clsService = clsService;
  }

  static getUser(): UserContext | null {
    if (!ContextHelper.clsService) {
      return null;
    }
    return ContextHelper.clsService.get('user');
  }

  static setUser(user: UserContext | CurrentUser): void {
    if (!ContextHelper.clsService) {
      throw new Error('ClsService not initialized');
    }
    ContextHelper.clsService.set('user', user);
  }

  static getIp(): string {
    if (!ContextHelper.clsService) {
      return '';
    }
    return ContextHelper.clsService.get('ip') || '';
  }

  static setIp(ip: string): void {
    if (ContextHelper.clsService) {
      ContextHelper.clsService.set('ip', ip);
    }
  }

  static getLanguage(): string {
    if (!ContextHelper.clsService) {
      return 'en';
    }
    return ContextHelper.clsService.get('language') || 'en';
  }

  static setLanguage(language: string): void {
    if (ContextHelper.clsService) {
      ContextHelper.clsService.set('language', language);
    }
  }

  static getTrx(): any {
    if (!ContextHelper.clsService) {
      return null;
    }
    return ContextHelper.clsService.get('transaction');
  }

  static setTrx(trx: any): void {
    if (ContextHelper.clsService) {
      ContextHelper.clsService.set('transaction', trx);
    }
  }

  static getPermissions(): string[] {
    if (!ContextHelper.clsService) {
      return [];
    }
    return ContextHelper.clsService.get('permissions') || [];
  }

  static setPermissions(permissions: string[]): void {
    if (ContextHelper.clsService) {
      ContextHelper.clsService.set('permissions', permissions);
    }
  }

  static getUserId(): string | undefined {
    const user = ContextHelper.getUser();
    return user?.id;
  }

  static getCls(): ClsService {
    if (!ContextHelper.clsService) {
      throw new Error('ClsService not initialized');
    }
    return ContextHelper.clsService;
  }

  static hasAnyPermission(requiredPermissions: string[]): boolean {
    const userPermissions = ContextHelper.getPermissions();
    return requiredPermissions.some(permission => userPermissions.includes(permission));
  }

  static hasAllPermissions(requiredPermissions: string[]): boolean {
    const userPermissions = ContextHelper.getPermissions();
    return requiredPermissions.every(permission => userPermissions.includes(permission));
  }
}

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { ContextHelper } from '../helper/context.helper';

export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, params } = request;

    const action = this.mapMethodToAction(method);
    const userId = ContextHelper.getUserId();
    const ip = ContextHelper.getIp();

    return next.handle().pipe(
      tap(async (response) => {
        if (this.shouldAudit(method, url)) {
          await this.createAuditLog({
            userId,
            action,
            resource: this.extractEntityType(url),
            resourceId: params?.id || response?.id,
            metadata: method !== 'GET' ? body : undefined,
            ipAddress: ip,
            userAgent: request.headers['user-agent'],
          });
        }
      }),
    );
  }

  private mapMethodToAction(method: string): AuditAction {
    switch (method) {
      case 'POST':
        return AuditAction.CREATE;
      case 'PUT':
      case 'PATCH':
        return AuditAction.UPDATE;
      case 'DELETE':
        return AuditAction.DELETE;
      default:
        return AuditAction.READ;
    }
  }

  private shouldAudit(method: string, url: string): boolean {
    // Don't audit GET requests by default
    if (method === 'GET') return false;

    // Don't audit health checks, metrics, etc.
    const excludedPaths = ['/health', '/metrics', '/favicon.ico'];
    if (excludedPaths.some((path) => url.includes(path))) {
      return false;
    }

    return true;
  }

  private extractEntityType(url: string): string {
    const parts = url.split('/').filter(Boolean);
    // Remove 'api' and version prefix
    const entityPart = parts.find(
      (p) => !['api', 'v1', 'v2'].includes(p) && !p.match(/^[a-f0-9-]{36}$/i),
    );
    return entityPart || 'unknown';
  }

  private async createAuditLog(data: {
    userId?: string;
    action: AuditAction;
    resource: string;
    resourceId?: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          metadata: data.metadata,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      // Log but don't fail the request
      console.error('Failed to create audit log:', error);
    }
  }
}

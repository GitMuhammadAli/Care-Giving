import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from '../entity/audit-log.entity';
import { ContextHelper } from '../helper/context.helper';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

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
            entityType: this.extractEntityType(url),
            entityId: params?.id || response?.id,
            newValue: method !== 'GET' ? body : undefined,
            ipAddress: ip,
            userAgent: request.headers['user-agent'],
            requestPath: url,
            requestMethod: method,
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

  private async createAuditLog(data: Partial<AuditLog>): Promise<void> {
    try {
      const log = this.auditLogRepository.create(data);
      await this.auditLogRepository.save(log);
    } catch (error) {
      // Log but don't fail the request
      console.error('Failed to create audit log:', error);
    }
  }
}


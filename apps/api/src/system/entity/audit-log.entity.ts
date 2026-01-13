import { Entity, Column, Index } from 'typeorm';
import { BaseEntityWithoutSoftDelete } from './base.entity';

export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  FAILED_LOGIN = 'FAILED_LOGIN',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  EMERGENCY_ALERT = 'EMERGENCY_ALERT',
  MEDICATION_LOG = 'MEDICATION_LOG',
  DOCUMENT_ACCESS = 'DOCUMENT_ACCESS',
}

@Entity('audit_logs')
@Index(['userId', 'createdAt'])
@Index(['action', 'createdAt'])
@Index(['entityType', 'entityId'])
export class AuditLog extends BaseEntityWithoutSoftDelete {
  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ nullable: true })
  entityType?: string;

  @Column({ type: 'uuid', nullable: true })
  entityId?: string;

  @Column({ type: 'jsonb', nullable: true })
  oldValue?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  newValue?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  requestPath?: string;

  @Column({ nullable: true })
  requestMethod?: string;
}


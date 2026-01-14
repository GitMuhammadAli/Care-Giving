import { Injectable } from '@nestjs/common';
import { DataSource, Repository, LessThan } from 'typeorm';
import { Session } from '../entity/session.entity';
import { ContextHelper } from '../../system/helper/context.helper';

@Injectable()
export class SessionRepository extends Repository<Session> {
  constructor(private dataSource: DataSource) {
    super(Session, dataSource.createEntityManager());
  }

  private getManager() {
    return ContextHelper.getTrx() || this.manager;
  }

  async findByRefreshToken(refreshToken: string): Promise<Session | null> {
    return this.getManager().findOne(Session, {
      where: { refreshToken, isActive: true },
      relations: ['user'],
    });
  }

  async findActiveByUserId(userId: string): Promise<Session[]> {
    return this.getManager().find(Session, {
      where: { userId, isActive: true },
      order: { lastUsedAt: 'DESC' },
    });
  }

  async createSession(data: Partial<Session>): Promise<Session> {
    const session = this.getManager().create(Session, data);
    return this.getManager().save(Session, session);
  }

  async updateLastUsed(id: string): Promise<void> {
    await this.getManager().update(Session, id, { lastUsedAt: new Date() });
  }

  async updateRefreshToken(id: string, newRefreshToken: string): Promise<void> {
    await this.getManager().update(Session, id, {
      refreshToken: newRefreshToken,
      lastUsedAt: new Date(),
    });
  }

  async invalidateSession(refreshToken: string): Promise<void> {
    await this.getManager().update(
      Session,
      { refreshToken },
      { isActive: false },
    );
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    await this.getManager().update(
      Session,
      { userId, isActive: true },
      { isActive: false },
    );
  }

  async invalidateAllExceptCurrent(userId: string, currentToken: string): Promise<void> {
    await this.getManager()
      .createQueryBuilder()
      .update(Session)
      .set({ isActive: false })
      .where('userId = :userId', { userId })
      .andWhere('refreshToken != :currentToken', { currentToken })
      .andWhere('isActive = true')
      .execute();
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.getManager().delete(Session, {
      expiresAt: LessThan(new Date()),
    });
    return result.affected || 0;
  }
}


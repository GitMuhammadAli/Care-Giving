import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheService } from './cache.service';
import { RedisProvider, REDIS_CLIENT } from './redis.provider';

/**
 * CacheModule - Global caching module
 *
 * Provides:
 * - REDIS_CLIENT: Shared Redis connection (can be injected directly)
 * - CacheService: High-level caching API with getOrSet, invalidation, etc.
 *
 * Usage:
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   constructor(private cacheService: CacheService) {}
 *
 *   async getData(id: string) {
 *     return this.cacheService.getOrSet(
 *       `mydata:${id}`,
 *       () => this.fetchFromDb(id),
 *       300 // 5 minutes TTL
 *     );
 *   }
 * }
 * ```
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisProvider, CacheService],
  exports: [REDIS_CLIENT, CacheService],
})
export class CacheModule {}

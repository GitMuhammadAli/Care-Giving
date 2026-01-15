import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const dbConfig = this.configService.get('database');
    const appConfig = this.configService.get('app');
    const isProduction = appConfig?.isProduction ?? false;

    // Base options
    const options: TypeOrmModuleOptions = {
      type: 'postgres',
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      // Enable migrations
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      migrationsRun: false,
      synchronize: false,
      // Enable query logging in development, log only errors in production
      logging: isProduction ? ['error'] : ['query', 'error', 'warn', 'schema'],
      // Log slow queries (>1000ms)
      maxQueryExecutionTime: 1000,
      ssl: dbConfig?.ssl || false,
      extra: {
        max: 100,
        connectionTimeoutMillis: 10000,
        // Additional optimizations
        idleTimeoutMillis: 30000,
        // Enable statement timeout (30s)
        statement_timeout: 30000,
      },
    };

    // Use URL if available, otherwise use individual connection params
    if (dbConfig?.url) {
      return {
        ...options,
        url: dbConfig.url,
      };
    }

    return {
      ...options,
      host: dbConfig?.host || 'localhost',
      port: dbConfig?.port || 5432,
      username: dbConfig?.username || 'postgres',
      password: dbConfig?.password || '',
      database: dbConfig?.database || 'carecircle',
    };
  }
}

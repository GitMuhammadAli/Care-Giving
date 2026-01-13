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
      // Disable migrations - database schema is managed by Prisma
      migrations: [],
      migrationsRun: false,
      synchronize: false,
      logging: !isProduction,
      ssl: dbConfig?.ssl || false,
      extra: {
        max: 100,
        connectionTimeoutMillis: 10000,
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

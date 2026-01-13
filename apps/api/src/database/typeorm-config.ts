/**
 * TypeORM DataSource Configuration
 * Used for CLI migrations (not runtime - runtime uses TypeOrmConfigService)
 */
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { optionalString, int, bool, isDevelopment } from '../config/env.helpers';

// Load environment variables
config();

const databaseUrl = optionalString('DATABASE_URL');
const dbSsl = bool('DB_SSL', false);

// Build connection options
const baseOptions: Partial<DataSourceOptions> = {
  type: 'postgres',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: isDevelopment(),
  ssl: dbSsl ? { rejectUnauthorized: false } : false,
};

// Use DATABASE_URL if provided, otherwise use individual components
export const dataSourceOptions: DataSourceOptions = databaseUrl
  ? {
      ...baseOptions,
      type: 'postgres',
      url: databaseUrl,
    }
  : {
      ...baseOptions,
      type: 'postgres',
      host: optionalString('DB_HOST', 'localhost'),
      port: int('DB_PORT', 5432),
      username: optionalString('DB_USERNAME', 'postgres'),
      password: optionalString('DB_PASSWORD', ''),
      database: optionalString('DB_DATABASE', 'carecircle'),
    };

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;

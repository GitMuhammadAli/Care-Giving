const { DataSource } = require('typeorm');

const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: '1234',
  database: 'carecircle',
  entities: ['dist/**/*.entity.js'],
  synchronize: true, // WARNING: Use only for development!
  logging: true,
});

AppDataSource.initialize()
  .then(async () => {
    console.log('✅ Database schema synchronized successfully!');
    await AppDataSource.destroy();
  })
  .catch((error) => {
    console.error('❌ Error synchronizing database:', error);
    process.exit(1);
  });

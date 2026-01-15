const { DataSource } = require('typeorm');

const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: '1234',
  database: 'carecircle',
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/database/migrations/*.js'],
  synchronize: false,
  logging: true,
});

AppDataSource.initialize()
  .then(async () => {
    console.log('Data Source initialized');
    await AppDataSource.runMigrations();
    console.log('Migrations completed!');
    await AppDataSource.destroy();
  })
  .catch((error) => console.log('Error:', error));

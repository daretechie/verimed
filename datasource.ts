import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { VerificationLogEntity } from './src/infrastructure/persistence/entities/verification-log.entity';

config(); // Load .env file

export const AppDataSource = new DataSource({
  type: (process.env.DATABASE_URL ? 'postgres' : 'sqlite') as any,
  url: process.env.DATABASE_URL,
  database: process.env.DATABASE_URL ? undefined : 'verimed.sqlite',
  synchronize: false,
  logging: true,
  entities: [VerificationLogEntity],
  migrations: ['dist/infrastructure/persistence/migrations/*.js'],
  subscribers: [],
} as any);

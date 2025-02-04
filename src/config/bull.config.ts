/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import { Queue } from 'bullmq';
import { config } from 'dotenv';
import IORedis, { RedisOptions, Redis } from 'ioredis';

config(); // Carregar variáveis do .env

const redisOptions: RedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
};

let redisConnection: Redis | null = null;

try {
  redisConnection = new IORedis(redisOptions);
} catch (error) {
  console.error('Failed to create Redis connection:', error);
  throw error;
}

if (!redisConnection) {
  throw new Error('Redis connection is null');
}

// Criar a fila de e-mails
export const emailQueue = new Queue('emailQueue', {
  connection: redisConnection,
});

const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient;

const connectRedis = () => {
  const options = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  };

  if (process.env.REDIS_PASSWORD) {
    options.password = process.env.REDIS_PASSWORD;
  }

  redisClient = new Redis(options);

  redisClient.on('connect', () => logger.info('Redis connected'));
  redisClient.on('error', (err) => logger.error('Redis error:', err.message));
  redisClient.on('reconnecting', () => logger.info('Redis reconnecting…'));

  return redisClient;
};

const getRedis = () => {
  if (!redisClient) throw new Error('Redis not initialized. Call connectRedis first.');
  return redisClient;
};

module.exports = { connectRedis, getRedis };

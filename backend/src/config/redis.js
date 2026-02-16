const Redis = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

let redis = null;

function getRedis() {
  if (!redis) {
    redis = new Redis(env.redisUrl, { maxRetriesPerRequest: null });
    redis.on('error', (err) => logger.error('Redis error', err));
  }
  return redis;
}

module.exports = { getRedis };

const { getRedis } = require('../config/redis');
const { errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Redis-based rate limiter
 * @param {number} maxRequests - max requests allowed in window
 * @param {number} windowSeconds - window duration in seconds
 * @param {string} keyPrefix - Redis key prefix
 */
const redisRateLimit = (maxRequests, windowSeconds, keyPrefix = 'rl') => {
  return async (req, res, next) => {
    try {
      const redis = getRedis();
      const identifier = req.ip || req.connection.remoteAddress;
      const key = `${keyPrefix}:${identifier}`;

      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));
      const ttl = await redis.ttl(key);
      res.setHeader('X-RateLimit-Reset', Date.now() + ttl * 1000);

      if (current > maxRequests) {
        return errorResponse(
          res,
          `Too many requests. Please try again after ${Math.ceil(ttl / 60)} minute(s).`,
          429
        );
      }

      next();
    } catch (error) {
      logger.error('Rate limit middleware error:', error.message);
      // Fail open if Redis is unavailable
      next();
    }
  };
};

// Specific limiters
const otpRateLimit = redisRateLimit(
  parseInt(process.env.OTP_RATE_LIMIT_MAX) || 5,
  900, // 15 min
  'otp-rl'
);

const apiRateLimit = redisRateLimit(
  parseInt(process.env.RATE_LIMIT_MAX) || 100,
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) / 1000 || 900,
  'api-rl'
);

module.exports = { redisRateLimit, otpRateLimit, apiRateLimit };

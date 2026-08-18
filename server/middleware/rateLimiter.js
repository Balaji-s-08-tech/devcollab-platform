const { RateLimiterMemory, RateLimiterRedis } = require("rate-limiter-flexible");
const { getRedisClient } = require("../config/redis");

const getIp = (req) =>
  req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || req.socket?.remoteAddress || "unknown";

const setHeaders = (res, result, points, duration) => {
  res.setHeader("RateLimit-Limit", points);
  res.setHeader("RateLimit-Remaining", Math.max(result.remainingPoints, 0));
  res.setHeader("RateLimit-Reset", Math.ceil((Date.now() + result.msBeforeNext) / 1000));
  res.setHeader("RateLimit-Policy", `${points};w=${duration}`);
};

const createRateLimiter = ({
  keyPrefix,
  points,
  duration,
  blockDuration = duration,
  keyGenerator = getIp,
  message = "Too many requests, please try again later",
}) => {
  const memoryLimiter = new RateLimiterMemory({
    keyPrefix: `${keyPrefix}:memory`,
    points,
    duration,
    blockDuration,
  });
  let redisLimiter;

  return async (req, res, next) => {
    const redis = getRedisClient();
    if (!redisLimiter && redis?.status === "ready") {
      redisLimiter = new RateLimiterRedis({
        storeClient: redis,
        keyPrefix,
        points,
        duration,
        blockDuration,
        insuranceLimiter: memoryLimiter,
      });
    }

    const limiter = redisLimiter || memoryLimiter;
    const key = keyGenerator(req);

    try {
      const result = await limiter.consume(key);
      setHeaders(res, result, points, duration);
      return next();
    } catch (result) {
      const retryAfter = Math.max(Math.ceil((result.msBeforeNext || 1000) / 1000), 1);
      res.setHeader("Retry-After", retryAfter);
      return res.status(429).json({ success: false, message });
    }
  };
};

const publicLimiter = createRateLimiter({
  keyPrefix: "rl:public",
  points: Number(process.env.PUBLIC_RATE_LIMIT_POINTS || 300),
  duration: Number(process.env.PUBLIC_RATE_LIMIT_DURATION || 15 * 60),
  keyGenerator: getIp,
});

const authenticatedLimiter = createRateLimiter({
  keyPrefix: "rl:user",
  points: Number(process.env.USER_RATE_LIMIT_POINTS || 1000),
  duration: Number(process.env.USER_RATE_LIMIT_DURATION || 15 * 60),
  keyGenerator: (req) => `user:${req.user?._id || getIp(req)}`,
});

const authLimiter = createRateLimiter({
  keyPrefix: "rl:auth",
  points: Number(process.env.AUTH_RATE_LIMIT_POINTS || 10),
  duration: Number(process.env.AUTH_RATE_LIMIT_DURATION || 15 * 60),
  blockDuration: Number(process.env.AUTH_RATE_LIMIT_BLOCK_DURATION || 15 * 60),
  keyGenerator: getIp,
  message: "Too many authentication attempts, please try again later",
});

const searchLimiter = createRateLimiter({
  keyPrefix: "rl:search",
  points: Number(process.env.SEARCH_RATE_LIMIT_POINTS || 60),
  duration: Number(process.env.SEARCH_RATE_LIMIT_DURATION || 60),
  keyGenerator: (req) => `search:${req.user?._id || getIp(req)}`,
  message: "Search rate limit exceeded",
});

module.exports = {
  apiLimiter: publicLimiter,
  authLimiter,
  authenticatedLimiter,
  createRateLimiter,
  publicLimiter,
  searchLimiter,
};

const Redis = require("ioredis");
const logger = require("./logger");

let redisClient;

const connectRedis = async () => {
  const url = process.env.REDIS_URL || "redis://localhost:6379";

  redisClient = new Redis(url, {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    retryStrategy: (times) => {
      if (times > 3) {
        logger.warn("Redis unavailable — running without cache. Video rooms & rate-limit cache disabled.");
        return null;
      }
      return Math.min(times * 200, 1000);
    },
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  redisClient.on("connect", () => logger.info("✅ Redis connected"));
  redisClient.on("error", (err) => logger.warn(`Redis warning: ${err.message}`));
  redisClient.on("reconnecting", () => logger.warn("Redis reconnecting..."));

  try {
    await redisClient.connect();
    await redisClient.ping();
    logger.info("✅ Redis ready");
  } catch (err) {
    logger.warn(`⚠️  Redis not available (${err.message}) — server will run without cache layer`);
    redisClient = null;
  }
  return redisClient;
};

const getCache = async (key) => {
  if (!redisClient) return null;
  try {
    const data = await redisClient.get(key);
    if (!data) return null;
    try { return JSON.parse(data); } catch { return data; }
  } catch {
    return null;
  }
};

const setCache = async (key, value, ttl = 3600) => {
  if (!redisClient) return;
  try {
    await redisClient.setex(key, ttl, JSON.stringify(value));
  } catch (err) {
    logger.error("Redis setCache error:", err.message);
  }
};

const deleteCache = async (...keys) => {
  if (!redisClient) return;
  try {
    await redisClient.del(...keys);
  } catch (err) {
    logger.error("Redis deleteCache error:", err.message);
  }
};

const deleteCachePattern = async (pattern) => {
  if (!redisClient) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) await redisClient.del(...keys);
  } catch (err) {
    logger.error("Redis deleteCachePattern error:", err.message);
  }
};

const publish = async (channel, message) => {
  if (!redisClient) return;
  try {
    await redisClient.publish(channel, JSON.stringify(message));
  } catch (err) {
    logger.error("Redis publish error:", err.message);
  }
};

const getRedisClient = () => redisClient;

module.exports = {
  connectRedis,
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  publish,
  getRedisClient,
};

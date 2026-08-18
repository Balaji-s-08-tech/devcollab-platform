const { getCache, setCache } = require("../config/redis");

const cacheMiddleware = (ttl = 60) => async (req, res, next) => {
  if (req.method !== "GET") return next();

  const key = `cache:${req.user?._id || "public"}:${req.originalUrl}`;
  const cached = await getCache(key);

  if (cached) {
    return res.json({ ...cached, _cached: true });
  }

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode === 200 && body?.success !== false) {
      setCache(key, body, ttl);
    }
    return originalJson(body);
  };

  next();
};

module.exports = { cacheMiddleware };

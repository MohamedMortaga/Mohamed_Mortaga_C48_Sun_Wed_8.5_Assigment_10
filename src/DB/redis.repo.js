import { redisClient } from "./redis.connection.js";

function checkRedis() {
  if (!redisClient.isReady) {
    throw new Error("Redis is not connected, set REDIS_URL in .env", {
      cause: { statusCode: 503 },
    });
  }
}

// Save a value that Redis deletes by itself after `ttl` seconds.
export async function setValue({ key, value, ttl } = {}) {
  checkRedis();
  return await redisClient.set(key, value, ttl ? { EX: ttl } : undefined);
}

export async function getValue({ key } = {}) {
  checkRedis();
  return await redisClient.get(key);
}

// Seconds left before the key expires (-2 = key doesn't exist, -1 = no expiry).
export async function getTTL({ key } = {}) {
  checkRedis();
  return await redisClient.ttl(key);
}

export async function deleteKey({ key } = {}) {
  checkRedis();
  return await redisClient.del(key);
}

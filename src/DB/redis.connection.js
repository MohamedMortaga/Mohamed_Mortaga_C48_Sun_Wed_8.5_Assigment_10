import { createClient } from "redis";
import { REDIS_URL } from "../config/config.js";

export const redisClient = createClient({ url: REDIS_URL });

redisClient.on("error", (error) => {
  console.error("Redis error:", error.message);
});

export async function connectRedis() {
  if (!REDIS_URL) {
    console.warn("REDIS_URL is empty in .env -> OTP features are disabled");
    return;
  }

  try {
    await redisClient.connect();
    console.log("Redis Connected");
  } catch (error) {
    console.error("Error connecting to Redis:", error.message);
  }
}

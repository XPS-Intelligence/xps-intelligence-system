import { Redis } from "ioredis";
import { env } from "./env.js";
import { log } from "./logger.js";

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableReadyCheck: true,
    });

    client.on("error", (err: Error) => {
      log("error", "[Redis] Connection error", { error: err.message });
    });
  }

  return client;
}

export async function pingRedis(): Promise<void> {
  const redis = getRedis();
  if (redis.status !== "ready") {
    await redis.connect();
  }
  const response = await redis.ping();
  if (response !== "PONG") {
    throw new Error(`Unexpected Redis ping response: ${response}`);
  }
}

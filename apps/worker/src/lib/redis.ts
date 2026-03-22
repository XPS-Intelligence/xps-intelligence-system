import IORedis from "ioredis";
import { env } from "./env.js";
import { log } from "./logger.js";

type RedisClient = {
  on(event: "error", listener: (error: Error) => void): RedisClient;
  ping(): Promise<string>;
  quit(): Promise<string>;
  set(key: string, value: string, ...args: Array<string | number>): Promise<unknown>;
  brpop(key: string, timeout: number): Promise<[string, string] | null>;
};

type RedisCtor = new (url: string, options?: { maxRetriesPerRequest?: number; lazyConnect?: boolean }) => RedisClient;

let client: RedisClient | null = null;

export function getRedis(): RedisClient {
  if (!client) {
    const Redis = IORedis as unknown as RedisCtor;
    client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });
    client.on("error", (error: Error) => {
      log.error("[Redis] Connection error", { error: error.message });
    });
  }

  return client;
}

export async function pingRedis(): Promise<void> {
  await getRedis().ping();
}

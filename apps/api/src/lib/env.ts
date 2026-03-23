import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    HOST: z.string().default("0.0.0.0"),
    API_PORT: z.coerce.number().int().positive().optional(),
    APP_URL: z.string().default("http://localhost:3000"),
    CORS_ORIGINS: z.string().optional(),
    DATABASE_URL: z.string().optional(),
    DATABASE_SSL_MODE: z.enum(["disable", "require"]).default("disable"),
    REDIS_URL: z.string().default("redis://localhost:6379"),
    WORKER_QUEUE_KEY: z.string().default("xps:scrape:queue"),
    SUPABASE_URL: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    HUBSPOT_ACCESS_TOKEN: z.string().optional(),
    HUBSPOT_LIFECYCLE_STAGE: z.string().default("opportunity"),
    HUBSPOT_PIPELINE_STAGE: z.string().default("qualifiedtobuy"),
    JWT_SECRET: z.string().optional(),
    AUTH_TOKEN_TTL: z.string().default("8h"),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === "production") {
      if (!value.DATABASE_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "DATABASE_URL is required in production",
          path: ["DATABASE_URL"],
        });
      }
      if (!value.JWT_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "JWT_SECRET is required in production",
          path: ["JWT_SECRET"],
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${details}`);
}

export const env = {
  ...parsed.data,
  PORT: parsed.data.API_PORT ?? parsed.data.PORT,
  DATABASE_URL: parsed.data.DATABASE_URL ?? "",
  DATABASE_SSL_MODE: parsed.data.DATABASE_SSL_MODE,
  SUPABASE_URL: parsed.data.SUPABASE_URL ?? "",
  SUPABASE_SERVICE_ROLE_KEY: parsed.data.SUPABASE_SERVICE_ROLE_KEY ?? "",
  HUBSPOT_ACCESS_TOKEN: parsed.data.HUBSPOT_ACCESS_TOKEN ?? "",
  JWT_SECRET: parsed.data.JWT_SECRET ?? "dev-only-change-me",
};

export function getCorsOrigins(): string[] {
  if (env.CORS_ORIGINS) {
    return env.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);
  }

  if (env.APP_URL && env.APP_URL !== "*") {
    return [env.APP_URL];
  }

  return [];
}

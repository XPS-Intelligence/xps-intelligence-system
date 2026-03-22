import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env, getCorsOrigins } from "./lib/env.js";
import { log } from "./lib/logger.js";
import { analyticsRouter } from "./routes/analytics.js";
import { assistantsRouter } from "./routes/assistants.js";
import { authRouter } from "./routes/auth.js";
import { handleHealth, handleReady } from "./routes/health.js";
import { intelligenceRouter } from "./routes/intelligence.js";
import { leadCandidatesRouter } from "./routes/lead-candidates.js";
import { scrapeRouter } from "./routes/scrape.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  const allowedOrigins = getCorsOrigins();

  app.use(
    cors({
      origin: allowedOrigins.length > 0 ? allowedOrigins : true,
      credentials: false,
    })
  );
  app.use(helmet());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many requests, please try again later." },
    })
  );

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts, please try again later." },
  });

  app.get("/health", (req, res) => {
    void handleHealth(req, res);
  });
  app.get("/ready", (req, res) => {
    void handleReady(req, res);
  });
  app.get("/api/health", (req, res) => {
    void handleHealth(req, res);
  });
  app.get("/api/ready", (req, res) => {
    void handleReady(req, res);
  });
  app.use("/api/auth", authLimiter, authRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/assistants", assistantsRouter);
  app.use("/api/intelligence", intelligenceRouter);
  app.use("/api/lead-candidates", leadCandidatesRouter);
  app.use("/api/scrape", scrapeRouter);

  app.get("/api", (_req, res) => {
    res.json({
      service: "xps-intelligence-api",
      status: "ok",
      env: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    log("error", "Unhandled API error", { error: err.message });
    res.status(500).json({ error: "Internal server error", message: err.message });
  });

  return app;
}

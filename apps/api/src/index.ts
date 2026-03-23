import "./lib/load-env.js";
import { createApp } from "./app.js";
import { env } from "./lib/env.js";
import { log } from "./lib/logger.js";

const app = createApp();
const server = app.listen(env.PORT, env.HOST, () => {
  log("info", "XPS API listening", {
    port: env.PORT,
    host: env.HOST,
    nodeEnv: env.NODE_ENV,
  });
});

let shuttingDown = false;

function shutdown(signal: string) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  log("info", "Shutting down API", { signal });
  server.close(() => {
    log("info", "API server closed");
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  const error = reason instanceof Error ? { message: reason.message, stack: reason.stack } : { reason: String(reason) };
  log("error", "Unhandled promise rejection", error);
  shutdown("unhandledRejection");
});
process.on("uncaughtException", (error) => {
  log("error", "Uncaught exception", { message: error.message, stack: error.stack });
  shutdown("uncaughtException");
});

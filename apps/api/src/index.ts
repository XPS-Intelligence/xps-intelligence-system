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

function shutdown(signal: string) {
  log("info", "Shutting down API", { signal });
  server.close(() => {
    log("info", "API server closed");
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

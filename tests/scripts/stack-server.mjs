import { spawn } from "node:child_process";
import net from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const sharedEnv = {
  ...process.env,
  NODE_ENV: "development",
  HOST: "127.0.0.1",
  APP_URL: "http://127.0.0.1:3000",
  CORS_ORIGINS: "http://127.0.0.1:3000",
  DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:55433/xps",
  REDIS_URL: "redis://127.0.0.1:56380",
  JWT_SECRET: "playwright-e2e-secret",
  NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
  NEXT_PUBLIC_API_URL: "http://127.0.0.1:4000/api",
  PLAYWRIGHT_API_URL: "http://127.0.0.1:4000/api",
};

const children = [];
let dockerStarted = false;

function spawnCommand(command, extraEnv = {}) {
  const child = spawn(command, {
    cwd: rootDir,
    env: { ...sharedEnv, ...extraEnv },
    shell: true,
    stdio: "inherit",
  });

  children.push(child);
  child.on("exit", (code, signal) => {
    if (code !== 0 && signal !== "SIGTERM") {
      process.exitCode = code ?? 1;
    }
  });

  return child;
}

function waitForTcp(host, port, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const attempt = () => {
      const socket = net.createConnection({ host, port }, () => {
        socket.end();
        resolve();
      });

      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${host}:${port}`));
          return;
        }
        setTimeout(attempt, 1000);
      });
    };

    attempt();
  });
}

async function waitForHttp(url, timeoutMs = 180_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
    } catch {
      // Keep waiting.
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function main() {
  const dockerUp = spawnCommand("pnpm docker:up");
  await new Promise((resolve, reject) => {
    dockerUp.once("exit", (code) => {
      if (code === 0) {
        resolve(null);
      } else {
        reject(new Error(`docker:up failed with exit code ${code}`));
      }
    });
  });
  dockerStarted = true;

  await waitForTcp("127.0.0.1", 55433);
  await waitForTcp("127.0.0.1", 56380);
  await waitForHttp("http://127.0.0.1:4000/api/health");
  await waitForHttp("http://127.0.0.1:3000");

  setInterval(() => {
    // Keep the process alive until the parent test harness shuts the stack down.
  }, 60_000);
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function shutdown() {
  await Promise.allSettled(
    children.map(
      (child) =>
        new Promise((resolve) => {
          if (child.exitCode !== null || child.signalCode !== null) {
            resolve(null);
            return;
          }

          child.once("exit", () => resolve(null));
          child.kill("SIGTERM");
        })
    )
  );

  if (dockerStarted) {
    const dockerDown = spawnCommand("pnpm docker:down");
    await new Promise((resolve) => {
      dockerDown.once("exit", () => resolve(null));
    });
  }

  process.exit(0);
}

void main().catch((error) => {
  console.error(error);
  void shutdown();
});

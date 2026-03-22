import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const stackScript = path.join(rootDir, "tests", "scripts", "stack-server.mjs");

export const localBaseUrl = "http://127.0.0.1:3000";
export const localApiUrl = "http://127.0.0.1:4000/api";

function waitForHttp(url, timeoutMs = 180_000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
        if (response.ok) {
          resolve();
          return;
        }
      } catch {
        // Keep waiting.
      }

      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }

      setTimeout(tick, 1000);
    };

    void tick();
  });
}

export async function startRuntimeStack() {
  if (process.env.PLAYWRIGHT_BASE_URL) {
    return { child: null, baseURL: process.env.PLAYWRIGHT_BASE_URL, apiURL: process.env.PLAYWRIGHT_API_URL || localApiUrl };
  }

  try {
    await waitForHttp("http://127.0.0.1:4000/api/health", 1000);
    await waitForHttp(localBaseUrl, 1000);
    return { child: null, baseURL: localBaseUrl, apiURL: localApiUrl };
  } catch {
    // Fall through and bootstrap the stack.
  }

  const child = spawn(process.execPath, [stackScript], {
    cwd: rootDir,
    env: {
      ...process.env,
    },
    shell: false,
    stdio: "inherit",
  });

  const shutdown = () => {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
    }
  };

  process.once("exit", shutdown);
  process.once("SIGINT", () => {
    shutdown();
    process.exit(130);
  });
  process.once("SIGTERM", () => {
    shutdown();
    process.exit(143);
  });

  await waitForHttp("http://127.0.0.1:4000/api/health");
  await waitForHttp(localBaseUrl);

  return { child, baseURL: localBaseUrl, apiURL: localApiUrl };
}

export async function stopRuntimeStack(stack) {
  if (!stack?.child) {
    return;
  }

  await new Promise((resolve) => {
    if (stack.child.exitCode !== null || stack.child.signalCode !== null) {
      resolve(null);
      return;
    }

    stack.child.once("exit", () => resolve(null));
    stack.child.kill("SIGTERM");
  });
}

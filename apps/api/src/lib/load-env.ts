import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(moduleDir, "../..");
const repoRoot = path.resolve(appRoot, "../..");

const candidates = [
  path.join(repoRoot, ".env.local"),
  path.join(repoRoot, ".env"),
  path.join(appRoot, ".env.local"),
  path.join(appRoot, ".env"),
];

for (const candidate of candidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate, override: false });
  }
}

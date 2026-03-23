import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const schemaPath = path.join(rootDir, "packages", "db", "schema.sql");
const migrationPath = path.join(rootDir, "packages", "db", "migrations", "20260322_railway_auth_and_runtime.sql");

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const [schemaSql, migrationSql] = await Promise.all([
    fs.readFile(schemaPath, "utf8"),
    fs.readFile(migrationPath, "utf8"),
  ]);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.DATABASE_SSL_MODE === "require"
        ? { rejectUnauthorized: false }
        : false,
  });

  await client.connect();

  try {
    await client.query(schemaSql);
    await client.query(migrationSql);
    console.log("Railway schema migration applied.");
  } finally {
    await client.end();
  }
}

await main();

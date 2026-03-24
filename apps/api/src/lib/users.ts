import type { QueryResultRow } from "pg";
import { getDb } from "./db.js";
import type { AuthUser } from "../middleware/auth.js";

export type AppUserRow = QueryResultRow & {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: AuthUser["role"];
  organization_id: string | null;
  job_title: string | null;
  territory: string | null;
  autonomy_mode: "minimal" | "hybrid" | "full";
  onboarding_complete: boolean;
  profile: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  assistant_profile: Record<string, unknown> | null;
  last_login_at: string | null;
};

type CreateUserInput = {
  id?: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: AuthUser["role"];
  jobTitle?: string | null;
  territory?: string | null;
  autonomyMode?: "minimal" | "hybrid" | "full";
};

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "xps";
}

export function toAuthUser(user: AppUserRow): AuthUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    organization_id: user.organization_id ?? undefined,
    full_name: user.full_name,
    job_title: user.job_title ?? undefined,
    territory: user.territory ?? undefined,
    autonomy_mode: user.autonomy_mode,
    onboarding_complete: user.onboarding_complete,
  };
}

export async function findUserByEmail(email: string): Promise<AppUserRow | null> {
  const db = getDb();
  const result = await db.query<AppUserRow>(
    `SELECT
       id,
       email,
       password_hash,
       full_name,
       role,
       organization_id,
       job_title,
       territory,
       autonomy_mode,
       onboarding_complete,
       profile,
       settings,
       assistant_profile,
       last_login_at::text
     FROM app_users
     WHERE email = $1
     LIMIT 1`,
    [email.trim().toLowerCase()]
  );

  return result.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<AppUserRow | null> {
  const db = getDb();
  const result = await db.query<AppUserRow>(
    `SELECT
       id,
       email,
       password_hash,
       full_name,
       role,
       organization_id,
       job_title,
       territory,
       autonomy_mode,
       onboarding_complete,
       profile,
       settings,
       assistant_profile,
       last_login_at::text
     FROM app_users
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function countUsers(): Promise<number> {
  const db = getDb();
  const result = await db.query<{ total: string }>("SELECT COUNT(*)::text AS total FROM app_users");
  return Number(result.rows[0]?.total ?? 0);
}

async function ensureDefaultOrganization(): Promise<string> {
  const db = getDb();
  const slug = slugify("xtreme-polishing-systems");
  const existing = await db.query<{ id: string }>(
    "SELECT id FROM organizations WHERE slug = $1 LIMIT 1",
    [slug]
  );

  if (existing.rows[0]) {
    return existing.rows[0].id;
  }

  const inserted = await db.query<{ id: string }>(
    `INSERT INTO organizations (name, slug, metadata)
     VALUES ($1, $2, $3)
     RETURNING id`,
    ["Xtreme Polishing Systems", slug, JSON.stringify({ system: "xps-intelligence-system" })]
  );

  return inserted.rows[0].id;
}

export async function createUser(input: CreateUserInput): Promise<AppUserRow> {
  const db = getDb();
  const organizationId = await ensureDefaultOrganization();
  const inserted = await db.query<AppUserRow>(
    `INSERT INTO app_users (
       id,
       email,
       password_hash,
       full_name,
       role,
       organization_id,
       job_title,
       territory,
       autonomy_mode,
       onboarding_complete,
       profile,
       settings,
       assistant_profile
     )
     VALUES (COALESCE($1::uuid, uuid_generate_v4()),$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING
       id,
       email,
       password_hash,
       full_name,
       role,
       organization_id,
       job_title,
       territory,
       autonomy_mode,
       onboarding_complete,
       profile,
       settings,
       assistant_profile,
       last_login_at::text`,
    [
      input.id ?? undefined,
      input.email.trim().toLowerCase(),
      input.passwordHash,
      input.fullName,
      input.role,
      organizationId,
      input.jobTitle ?? null,
      input.territory ?? null,
      input.autonomyMode ?? "hybrid",
      true,
      JSON.stringify({ source: "railway-first-auth" }),
      JSON.stringify({}),
      JSON.stringify({}),
    ]
  );

  return inserted.rows[0];
}

export async function recordUserLogin(id: string): Promise<void> {
  const db = getDb();
  await db.query("UPDATE app_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1", [id]);
}

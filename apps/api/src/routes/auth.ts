import { Router } from "express";
import { z } from "zod";
import { requireAuth, signAuthToken, type AuthUser } from "../middleware/auth.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { countUsers, createUser, findUserByEmail, findUserById, recordUserLogin, toAuthUser } from "../lib/users.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1),
  role: z.enum(["employee", "manager", "owner", "admin"]).default("employee"),
  job_title: z.string().min(1).optional(),
  territory: z.string().min(1).optional(),
  autonomy_mode: z.enum(["minimal", "hybrid", "full"]).default("hybrid"),
});

authRouter.post("/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const userRecord = await findUserByEmail(parsed.data.email);
    if (!userRecord) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPassword = await verifyPassword(parsed.data.password, userRecord.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    await recordUserLogin(userRecord.id);
    const user = toAuthUser(userRecord);

    return res.json({
      token: signAuthToken(user),
      user,
      profile_status: "found",
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

authRouter.post("/register", async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid registration payload", details: parsed.error.flatten() });
    }

    const existing = await findUserByEmail(parsed.data.email);
    if (existing) {
      return res.status(409).json({ error: "An account with that email already exists" });
    }

    const existingUsers = await countUsers();
    const role: AuthUser["role"] = existingUsers === 0 ? "admin" : parsed.data.role;
    const passwordHash = await hashPassword(parsed.data.password);
    const created = await createUser({
      email: parsed.data.email,
      passwordHash,
      fullName: parsed.data.full_name,
      role,
      jobTitle: parsed.data.job_title,
      territory: parsed.data.territory,
      autonomyMode: parsed.data.autonomy_mode,
    });

    await recordUserLogin(created.id);
    const user = toAuthUser(created);

    return res.status(201).json({
      token: signAuthToken(user),
      user,
      profile_status: existingUsers === 0 ? "bootstrap-admin" : "created",
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

authRouter.post("/logout", (_req, res) => {
  res.json({ status: "ok" });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const profile = await findUserById(req.user.id);
    return res.json({
      user: profile ? toAuthUser(profile) : req.user,
      profile_status: profile ? "found" : "missing",
      profile: profile
        ? {
            id: profile.id,
            email: profile.email,
            role: profile.role,
            full_name: profile.full_name,
            organization_id: profile.organization_id,
            job_title: profile.job_title,
            territory: profile.territory,
            autonomy_mode: profile.autonomy_mode,
            onboarding_complete: profile.onboarding_complete,
          }
        : null,
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../lib/env.js";

const authRoles = ["employee", "manager", "owner", "admin"] as const;

const authUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  role: z.enum(authRoles),
  organization_id: z.string().optional(),
  full_name: z.string().optional(),
  job_title: z.string().optional(),
  territory: z.string().optional(),
  autonomy_mode: z.enum(["minimal", "hybrid", "full"]).optional(),
  onboarding_complete: z.boolean().optional(),
});

export type AuthUser = z.infer<typeof authUserSchema>;

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signAuthToken(user: AuthUser): string {
  return jwt.sign(user, env.JWT_SECRET, {
    expiresIn: env.AUTH_TOKEN_TTL as jwt.SignOptions["expiresIn"],
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const token = header.slice(7);

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const parsed = authUserSchema.safeParse(decoded);
    if (!parsed.success) {
      res.status(401).json({ error: "Invalid token payload" });
      return;
    }

    req.user = parsed.data;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: AuthUser["role"][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    next();
  };
}

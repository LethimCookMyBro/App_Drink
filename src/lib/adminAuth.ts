import type { Admin } from "@prisma/client";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import env from "@/lib/env";
import logger from "@/lib/logger";
import { createTokenFingerprint } from "@/lib/securityPrimitives";

export interface AdminTokenPayload {
  adminId: string;
  role: string;
  username: string;
  iat?: number;
  exp?: number;
}

export function getAdminJwtSecret(): string {
  return env.adminJwtSecret;
}

export function signAdminToken(admin: Pick<Admin, "id" | "email" | "role">) {
  return jwt.sign(
    {
      adminId: admin.id,
      username: admin.email,
      role: admin.role,
      iat: Math.floor(Date.now() / 1000),
    },
    getAdminJwtSecret(),
    { expiresIn: "2h" },
  );
}

export function getAdminTokenFingerprint(token: string) {
  return createTokenFingerprint(token);
}

export async function getAdminTokenFromCookies(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get("admin-token")?.value ?? null;
  } catch {
    return null;
  }
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getAdminJwtSecret()) as AdminTokenPayload;
    if (!decoded?.adminId || !decoded.username) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function verifyAdminTokenDetailed(token: string): {
  payload: AdminTokenPayload | null;
  reason?: "expired" | "invalid";
} {
  try {
    const decoded = jwt.verify(token, getAdminJwtSecret()) as AdminTokenPayload;
    if (!decoded?.adminId || !decoded.username) {
      return { payload: null, reason: "invalid" };
    }

    return { payload: decoded };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { payload: null, reason: "expired" };
    }

    return { payload: null, reason: "invalid" };
  }
}

export async function getAdminFromCookies(): Promise<Admin | null> {
  const token = await getAdminTokenFromCookies();
  if (!token) return null;

  const payload = verifyAdminToken(token);
  if (!payload) return null;

  try {
    const { default: prisma } = await import("./db");
    const admin = await prisma.admin.findUnique({
      where: { id: payload.adminId },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        activeTokenFingerprint: true,
        activeTokenIssuedAt: true,
      },
    });
    if (!admin || !admin.isActive) return null;
    if (admin.email !== payload.username) return null;
    if (
      admin.activeTokenFingerprint &&
      admin.activeTokenFingerprint !== getAdminTokenFingerprint(token)
    ) {
      return null;
    }
    return admin;
  } catch (error) {
    logger.error("admin.lookup.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

export async function requireAdmin(): Promise<Admin | null> {
  return getAdminFromCookies();
}

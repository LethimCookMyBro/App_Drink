import type { Admin } from "@prisma/client";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const DEV_FALLBACK_SECRET = "wong-taek-admin-dev-secret";

export interface AdminTokenPayload {
  adminId: string;
  role: string;
  username: string;
  iat?: number;
  exp?: number;
}

export function getAdminJwtSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ADMIN_JWT_SECRET is required in production");
    }
    return DEV_FALLBACK_SECRET;
  }
  return secret;
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
    { expiresIn: "24h" },
  );
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

export async function getAdminFromCookies(): Promise<Admin | null> {
  const token = await getAdminTokenFromCookies();
  if (!token) return null;

  const payload = verifyAdminToken(token);
  if (!payload) return null;

  try {
    const { default: prisma } = await import("./db");
    const admin = await prisma.admin.findUnique({
      where: { id: payload.adminId },
    });
    if (!admin || !admin.isActive) return null;
    if (admin.email !== payload.username) return null;
    return admin;
  } catch (error) {
    console.error("Admin lookup failed:", error);
    return null;
  }
}

export async function requireAdmin(): Promise<Admin | null> {
  return getAdminFromCookies();
}

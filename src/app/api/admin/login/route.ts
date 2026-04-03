import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { adminLoginSchema } from "@/lib/schemas";
import {
  getAdminTokenFingerprint,
  signAdminToken,
} from "@/lib/adminAuth";
import {
  handleLoginFailure,
  handleLoginSuccess,
  getAdminLockout,
  normalizeAdminIdentifier,
} from "@/lib/adminSecurity";
import {
  buildSessionCookieOptions,
  enforceRateLimit,
  enforceSameOrigin,
  jsonError,
  mapServerError,
} from "@/lib/apiUtils";
import { env } from "@/lib/env";
import logger from "@/lib/logger";
import { getClientIP } from "@/lib/rateLimit";
import { rateLimitConfigs } from "@/lib/rateLimit";
import { verifyTurnstileToken } from "@/lib/cloudflare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isDefaultAdminSeed(
  username: string,
  email: string,
  password: string,
): boolean {
  return (
    username === "admin" ||
    email === "admin@example.com" ||
    password === "change-me-please"
  );
}

export async function POST(request: Request) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const body = await request.json();
    const usernameInput =
      typeof body?.username === "string"
        ? body.username
        : typeof body?.email === "string"
          ? body.email
          : "";
    const validation = adminLoginSchema.safeParse({
      username: usernameInput,
      password: body?.password,
    });
    if (!validation.success) {
      return jsonError(
        validation.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง",
        400,
      );
    }

    const identifier = normalizeAdminIdentifier(validation.data.username);
    const ip = getClientIP(request);
    const userAgent = request.headers.get("user-agent") ?? undefined;

    const rateLimited = enforceRateLimit(request, rateLimitConfigs.auth, identifier);
    if (rateLimited) return rateLimited;

    const lockout = await getAdminLockout(identifier);
    if (lockout.locked) {
      await handleLoginFailure({
        identifier,
        ip,
        userAgent,
        reason: "locked",
      });
      return jsonError("Invalid credentials", 423, {
        retryAfter: lockout.retryAfterSeconds,
      });
    }

    const turnstileCheck = await verifyTurnstileToken(
      request,
      body?.turnstileToken,
      "admin_login",
    );
    if (!turnstileCheck.ok) {
      return jsonError(
        turnstileCheck.error || "การยืนยันความปลอดภัยไม่ผ่าน",
        turnstileCheck.status || 400,
      );
    }

    const { password } = validation.data;

    const { default: prisma } = await import("@/lib/db");
    const adminSelect = {
      id: true,
      email: true,
      password: true,
      name: true,
      role: true,
      isActive: true,
    } as const;

    let admin = await prisma.admin.findFirst({
      where: {
        email: {
          equals: identifier,
          mode: "insensitive",
        },
      },
      select: adminSelect,
    });

    const envAdminUsername = env.adminSeedUsername.trim();
    const envAdminPassword = env.adminSeedPassword;
    const envAdminName = env.adminSeedName;
    const envCredentialsMatch =
      !!envAdminUsername &&
      !!envAdminPassword &&
      identifier === normalizeAdminIdentifier(envAdminUsername) &&
      password === envAdminPassword;

    if (env.isProduction && isDefaultAdminSeed(envAdminUsername, envAdminUsername, envAdminPassword)) {
      logger.error("admin.login.default_seed_blocked");
      return jsonError("ระบบผู้ดูแลยังตั้งค่าไม่ปลอดภัย", 503);
    }

    let envAuthenticated = false;
    if (envCredentialsMatch) {
      const passwordHash = await bcrypt.hash(envAdminPassword, 12);
      if (!admin) {
        admin = await prisma.admin.create({
          data: {
            email: normalizeAdminIdentifier(envAdminUsername),
            password: passwordHash,
            name: envAdminName,
            role: "SUPER_ADMIN",
            isActive: true,
          },
          select: adminSelect,
        });
      } else {
        admin = await prisma.admin.update({
          where: { id: admin.id },
          data: {
            email: normalizeAdminIdentifier(envAdminUsername),
            password: passwordHash,
            isActive: true,
          },
          select: adminSelect,
        });
      }
      envAuthenticated = true;
    }

    if (!admin || !admin.isActive) {
      await handleLoginFailure({
        identifier,
        ip,
        userAgent,
        reason: "invalid_credentials",
      });
      return jsonError("Invalid credentials", 401);
    }

    const isPasswordValid = envAuthenticated
      ? true
      : await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      await handleLoginFailure({
        identifier,
        ip,
        userAgent,
        reason: "invalid_credentials",
      });
      return jsonError("Invalid credentials", 401);
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    const token = signAdminToken(admin);
    const tokenFingerprint = getAdminTokenFingerprint(token);

    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        activeTokenFingerprint: tokenFingerprint,
        activeTokenIssuedAt: new Date(),
      },
    });
    await handleLoginSuccess({
      adminId: admin.id,
      identifier,
      ip,
      userAgent,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "เข้าสู่ระบบสำเร็จ",
        admin: {
          username: admin.email,
          name: admin.name,
          role: admin.role,
        },
      },
      { status: 200 },
    );

    response.cookies.set("admin-token", token, buildSessionCookieOptions(60 * 60 * 2));

    return response;
  } catch (error) {
    logger.error("admin.login.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return mapServerError(error, "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
  }
}

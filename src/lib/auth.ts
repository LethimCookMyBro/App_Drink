import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Get JWT secret - check at runtime, not build time
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    console.error("WARNING: JWT_SECRET not set in production!");
  }
  return secret || "wong-taek-dev-secret-key";
}

const TOKEN_EXPIRY = "7d"; // Token expires in 7 days

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

// Hash password with secure salt rounds
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12; // Higher = more secure but slower
  return bcrypt.hash(password, saltRounds);
}

// Verify password with timing-safe comparison
export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
export function generateToken(
  payload: Omit<JWTPayload, "iat" | "exp">,
): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_EXPIRY });
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JWTPayload;
  } catch {
    return null;
  }
}

// Helper to get Prisma client with dynamic import
async function getPrisma() {
  const { default: prisma } = await import("./db");
  return prisma;
}

// Create user session in database
export async function createSession(userId: string, token: string) {
  const prisma = await getPrisma();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  return prisma.userSession.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });
}

// Validate session
export async function validateSession(token: string) {
  try {
    const prisma = await getPrisma();
    const session = await prisma.userSession.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) return null;

    // Check if expired
    if (session.expiresAt < new Date()) {
      await prisma.userSession.delete({ where: { id: session.id } });
      return null;
    }

    return session;
  } catch (error) {
    console.error("validateSession error:", error);
    return null;
  }
}

// Delete session (logout)
export async function deleteSession(token: string) {
  try {
    const prisma = await getPrisma();
    await prisma.userSession.delete({ where: { token } });
    return true;
  } catch {
    return false;
  }
}

// Delete all sessions for a user
export async function deleteAllUserSessions(userId: string) {
  try {
    const prisma = await getPrisma();
    await prisma.userSession.deleteMany({ where: { userId } });
  } catch (error) {
    console.error("deleteAllUserSessions error:", error);
  }
}

// Get user from request cookies/headers
export function getTokenFromRequest(request: Request): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Try cookie
  const cookies = request.headers.get("Cookie");
  if (cookies) {
    const tokenCookie = cookies
      .split(";")
      .find((c) => c.trim().startsWith("auth-token="));
    if (tokenCookie) {
      return tokenCookie.split("=")[1];
    }
  }

  return null;
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate password strength
export function isValidPassword(password: string): {
  valid: boolean;
  message?: string;
} {
  if (password.length < 8) {
    return { valid: false, message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" };
  }
  if (!/[A-Za-z]/.test(password)) {
    return { valid: false, message: "รหัสผ่านต้องมีตัวอักษรอย่างน้อย 1 ตัว" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว" };
  }
  return { valid: true };
}

// Sanitize user input - remove potentially dangerous characters
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove HTML-like tags
    .slice(0, 500); // Limit length
}

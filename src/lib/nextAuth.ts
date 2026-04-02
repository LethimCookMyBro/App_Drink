import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextResponse } from "next/server";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/db";
import { normalizeEmail, sanitizeInput } from "@/lib/auth";

const DEV_FALLBACK_NEXTAUTH_SECRET = "wong-taek-nextauth-dev-secret";
const NEXTAUTH_SESSION_COOKIE_NAMES = [
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
] as const;

type GoogleProfile = {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
};

function getNextAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXTAUTH_SECRET or JWT_SECRET is required in production");
    }

    return DEV_FALLBACK_NEXTAUTH_SECRET;
  }

  return secret;
}

function sanitizeDisplayName(name: string | undefined, email: string): string {
  const fallbackName = email.split("@")[0] || "ผู้ใช้ Google";
  return sanitizeInput((name || fallbackName).trim()).slice(0, 50);
}

function getCookieValue(request: Request, name: string): string | null {
  const rawCookieHeader = request.headers.get("cookie");
  if (!rawCookieHeader) {
    return null;
  }

  const matchedCookie = rawCookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`));

  if (!matchedCookie) {
    return null;
  }

  return decodeURIComponent(matchedCookie.slice(name.length + 1));
}

export function isGoogleLoginEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED === "true" &&
    typeof process.env.GOOGLE_CLIENT_ID === "string" &&
    process.env.GOOGLE_CLIENT_ID.length > 0 &&
    typeof process.env.GOOGLE_CLIENT_SECRET === "string" &&
    process.env.GOOGLE_CLIENT_SECRET.length > 0
  );
}

function getGoogleClientId(): string {
  return process.env.GOOGLE_CLIENT_ID || "disabled-google-client-id";
}

function getGoogleClientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET || "disabled-google-client-secret";
}

export async function deleteNextAuthSessionFromRequest(
  request: Request,
): Promise<void> {
  for (const cookieName of NEXTAUTH_SESSION_COOKIE_NAMES) {
    const sessionToken = getCookieValue(request, cookieName);
    if (!sessionToken) {
      continue;
    }

    await prisma.session.deleteMany({
      where: { sessionToken },
    });
  }
}

export function clearNextAuthSessionCookies(response: NextResponse) {
  for (const cookieName of NEXTAUTH_SESSION_COOKIE_NAMES) {
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: getNextAuthSecret(),
  session: {
    strategy: "database",
    maxAge: 60 * 60 * 24 * 7,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: getGoogleClientId(),
      clientSecret: getGoogleClientSecret(),
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        const googleProfile = profile as GoogleProfile;
        const email = normalizeEmail(googleProfile.email || "");

        return {
          id: googleProfile.sub || email,
          email,
          name: sanitizeDisplayName(googleProfile.name, email),
          image:
            typeof googleProfile.picture === "string"
              ? googleProfile.picture
              : null,
          emailVerified: googleProfile.email_verified ? new Date() : null,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (!isGoogleLoginEnabled()) {
        return false;
      }

      if (account?.provider !== "google") {
        return true;
      }

      const googleProfile = (profile || {}) as GoogleProfile;
      const email = normalizeEmail(googleProfile.email || "");
      const isVerified = googleProfile.email_verified === true;

      if (!email || !isVerified) {
        return false;
      }

      const matchingUsers = await prisma.user.findMany({
        where: { email },
        select: { id: true },
        take: 2,
      });

      if (matchingUsers.length > 1) {
        return false;
      }

      if (matchingUsers[0]) {
        const linkedProviders = await prisma.account.findMany({
          where: { userId: matchingUsers[0].id },
          select: { provider: true },
        });

        if (
          linkedProviders.some((linkedAccount) => linkedAccount.provider !== "google")
        ) {
          return false;
        }
      }

      return true;
    },
    async session({ session, user }) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          email: true,
          name: true,
          avatarUrl: true,
          image: true,
          isVerified: true,
          emailVerified: true,
        },
      });

      if (session.user) {
        session.user.id = user.id;
        session.user.email = dbUser?.email ?? session.user.email ?? "";
        session.user.name = dbUser?.name ?? session.user.name ?? "";
        session.user.avatarUrl =
          dbUser?.avatarUrl ?? dbUser?.image ?? user.image ?? null;
        session.user.emailVerified = Boolean(
          dbUser?.emailVerified || dbUser?.isVerified,
        );
      }

      return session;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google" || !user.id) {
        return;
      }

      const googleProfile = (profile || {}) as GoogleProfile;
      const normalizedEmail = normalizeEmail(user.email || googleProfile.email || "");
      const normalizedName = sanitizeDisplayName(
        user.name || googleProfile.name,
        normalizedEmail,
      );
      const image =
        typeof user.image === "string"
          ? user.image
          : typeof googleProfile.picture === "string"
            ? googleProfile.picture
            : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          email: normalizedEmail,
          name: normalizedName,
          image,
          avatarUrl: image,
          isVerified: googleProfile.email_verified === true,
          emailVerified:
            googleProfile.email_verified === true ? new Date() : undefined,
          lastLoginAt: new Date(),
        },
      });
    },
  },
};

export function getAuthSession() {
  return getServerSession(authOptions);
}

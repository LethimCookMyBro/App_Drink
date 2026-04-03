import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextResponse } from "next/server";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/db";
import env from "@/lib/env";
import { normalizeEmail, sanitizeInput } from "@/lib/auth";
import {
  hashStoredSessionToken,
} from "@/lib/securityPrimitives";
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
  return env.nextAuthSecret;
}

function isConfiguredGoogleValue(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) {
    return false;
  }

  return !(
    normalized.startsWith("PUT_YOUR_") ||
    normalized.startsWith("put-your-")
  );
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
    env.googleLoginEnabled &&
    isConfiguredGoogleValue(env.googleClientId) &&
    isConfiguredGoogleValue(env.googleClientSecret)
  );
}

function getGoogleClientId(): string {
  return env.googleClientId || "disabled-google-client-id";
}

function getGoogleClientSecret(): string {
  return env.googleClientSecret || "disabled-google-client-secret";
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
      where: {
        sessionToken: {
          in: [hashStoredSessionToken(sessionToken), sessionToken],
        },
      },
    });
  }
}

function createSecureSessionAdapter() {
  const baseAdapter = PrismaAdapter(prisma);

  return {
    ...baseAdapter,
    async createSession(data: {
      sessionToken: string;
      userId: string;
      expires: Date;
    }) {
      return prisma.session.create({
        data: {
          ...data,
          sessionToken: hashStoredSessionToken(data.sessionToken),
        },
      });
    },
    async getSessionAndUser(sessionToken: string) {
      const hashedSessionToken = hashStoredSessionToken(sessionToken);
      let storedSession = await prisma.session.findUnique({
        where: { sessionToken: hashedSessionToken },
        include: { user: true },
      });

      if (!storedSession) {
        storedSession = await prisma.session.findUnique({
          where: { sessionToken },
          include: { user: true },
        });

        if (storedSession) {
          storedSession = await prisma.session.update({
            where: { id: storedSession.id },
            data: { sessionToken: hashedSessionToken },
            include: { user: true },
          });
        }
      }

      if (!storedSession) {
        return null;
      }

      return {
        session: {
          id: storedSession.id,
          sessionToken,
          userId: storedSession.userId,
          expires: storedSession.expires,
        },
        user: storedSession.user,
      };
    },
    async updateSession(data: {
      sessionToken?: string;
      userId?: string;
      expires?: Date;
    }) {
      if (!data.sessionToken) {
        return null;
      }

      const hashedSessionToken = hashStoredSessionToken(data.sessionToken);
      const existingSession = await prisma.session.findFirst({
        where: {
          OR: [
            { sessionToken: hashedSessionToken },
            { sessionToken: data.sessionToken },
          ],
        },
      });

      if (!existingSession) {
        return null;
      }

      const updatedSession = await prisma.session.update({
        where: { id: existingSession.id },
        data: {
          sessionToken: hashedSessionToken,
          expires: data.expires ?? existingSession.expires,
          userId: data.userId ?? existingSession.userId,
        },
      });

      return {
        ...updatedSession,
        sessionToken: data.sessionToken,
      };
    },
    async deleteSession(sessionToken: string) {
      await prisma.session.deleteMany({
        where: {
          sessionToken: {
            in: [hashStoredSessionToken(sessionToken), sessionToken],
          },
        },
      });
    },
  };
}

export function clearNextAuthSessionCookies(response: NextResponse) {
  for (const cookieName of NEXTAUTH_SESSION_COOKIE_NAMES) {
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
  }
}

export const authOptions: NextAuthOptions = {
  adapter: createSecureSessionAdapter(),
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

import type { User } from "@prisma/client";
import type { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getTokenFromRequest, validateSession } from "@/lib/auth";
import { getAuthSession } from "@/lib/nextAuth";

type AppUser = Pick<
  User,
  "id" | "email" | "name" | "avatarUrl" | "image" | "createdAt"
>;

export interface AuthUserResult {
  user: AppUser | null;
  clearLegacyCookie: boolean;
}

function toAppUser(user: AppUser | null): AppUser | null {
  if (!user) {
    return null;
  }

  return {
    ...user,
    avatarUrl: user.avatarUrl ?? user.image ?? null,
  };
}

export function clearLegacyAuthCookie(response: NextResponse) {
  response.cookies.set("auth-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export async function getAuthenticatedAppUser(
  request: Request,
): Promise<AuthUserResult> {
  const legacyToken = getTokenFromRequest(request);
  let clearLegacyCookie = false;

  if (legacyToken) {
    const legacySession = await validateSession(legacyToken);

    if (legacySession?.user) {
      return {
        user: toAppUser(legacySession.user),
        clearLegacyCookie: false,
      };
    }

    clearLegacyCookie = true;
  }

  const nextAuthSession = await getAuthSession();
  const userId = nextAuthSession?.user?.id;

  if (!userId) {
    return {
      user: null,
      clearLegacyCookie,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      image: true,
      createdAt: true,
    },
  });

  return {
    user: toAppUser(user),
    clearLegacyCookie,
  };
}

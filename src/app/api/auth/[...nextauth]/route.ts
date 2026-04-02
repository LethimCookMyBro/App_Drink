import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authOptions, isGoogleLoginEnabled } from "@/lib/nextAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function googleDisabledResponse() {
  return NextResponse.json(
    { error: "Google login is not configured" },
    { status: 503 },
  );
}

export async function GET(request: Request, context: unknown) {
  if (!isGoogleLoginEnabled()) {
    return googleDisabledResponse();
  }

  const handler = NextAuth(authOptions);
  return handler(request, context as never);
}

export async function POST(request: Request, context: unknown) {
  if (!isGoogleLoginEnabled()) {
    return googleDisabledResponse();
  }

  const handler = NextAuth(authOptions);
  return handler(request, context as never);
}

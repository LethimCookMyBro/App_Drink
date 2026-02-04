import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const DEV_FALLBACK_SECRET = "wong-taek-room-dev-secret";

export interface RoomHostTokenPayload {
  roomId: string;
  hostId: string;
  code: string;
  iat?: number;
  exp?: number;
}

export function getRoomJwtSecret(): string {
  const secret = process.env.ROOM_JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ROOM_JWT_SECRET is required in production");
    }
    return DEV_FALLBACK_SECRET;
  }
  return secret;
}

export function getRoomHostCookieName(code: string) {
  return `room-host-${code.toUpperCase()}`;
}

export function signRoomHostToken(payload: RoomHostTokenPayload) {
  return jwt.sign(payload, getRoomJwtSecret(), { expiresIn: "6h" });
}

export function verifyRoomHostToken(token: string): RoomHostTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getRoomJwtSecret()) as RoomHostTokenPayload;
    if (!decoded?.roomId || !decoded?.hostId || !decoded?.code) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function getRoomHostTokenFromCookies(
  code: string,
): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(getRoomHostCookieName(code))?.value ?? null;
  } catch {
    return null;
  }
}

export async function getRoomHostPayloadFromCookies(
  code: string,
): Promise<RoomHostTokenPayload | null> {
  const token = await getRoomHostTokenFromCookies(code);
  if (!token) return null;
  return verifyRoomHostToken(token);
}

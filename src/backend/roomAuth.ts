import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import env from "@/backend/env";
import {
  JWT_HS256_ALGORITHM,
  JWT_HS256_VERIFY_OPTIONS,
} from "@/backend/securityPrimitives";

export interface RoomHostTokenPayload {
  roomId: string;
  hostId: string;
  code: string;
  iat?: number;
  exp?: number;
}

export interface RoomPlayerTokenPayload {
  roomId: string;
  playerId: string;
  code: string;
  iat?: number;
  exp?: number;
}

export function getRoomJwtSecret(): string {
  return env.roomJwtSecret;
}

export function getRoomHostCookieName(code: string) {
  return `room-host-${code.toUpperCase()}`;
}

export function getRoomPlayerCookieName(code: string) {
  return `room-player-${code.toUpperCase()}`;
}

export function signRoomHostToken(payload: RoomHostTokenPayload) {
  return jwt.sign(payload, getRoomJwtSecret(), {
    expiresIn: "4h",
    algorithm: JWT_HS256_ALGORITHM,
  });
}

export function signRoomPlayerToken(payload: RoomPlayerTokenPayload) {
  return jwt.sign(payload, getRoomJwtSecret(), {
    expiresIn: "4h",
    algorithm: JWT_HS256_ALGORITHM,
  });
}

export function verifyRoomHostToken(token: string): RoomHostTokenPayload | null {
  try {
    const decoded = jwt.verify(
      token,
      getRoomJwtSecret(),
      JWT_HS256_VERIFY_OPTIONS,
    ) as unknown as RoomHostTokenPayload;
    if (!decoded?.roomId || !decoded?.hostId || !decoded?.code) return null;
    return decoded;
  } catch {
    if (env.previousRoomJwtSecret) {
      try {
        const decoded = jwt.verify(
          token,
          env.previousRoomJwtSecret,
          JWT_HS256_VERIFY_OPTIONS,
        ) as unknown as RoomHostTokenPayload;
        if (!decoded?.roomId || !decoded?.hostId || !decoded?.code) return null;
        return decoded;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function verifyRoomPlayerToken(
  token: string,
): RoomPlayerTokenPayload | null {
  try {
    const decoded = jwt.verify(
      token,
      getRoomJwtSecret(),
      JWT_HS256_VERIFY_OPTIONS,
    ) as unknown as RoomPlayerTokenPayload;
    if (!decoded?.roomId || !decoded?.playerId || !decoded?.code) return null;
    return decoded;
  } catch {
    if (env.previousRoomJwtSecret) {
      try {
        const decoded = jwt.verify(
          token,
          env.previousRoomJwtSecret,
          JWT_HS256_VERIFY_OPTIONS,
        ) as unknown as RoomPlayerTokenPayload;
        if (!decoded?.roomId || !decoded?.playerId || !decoded?.code) return null;
        return decoded;
      } catch {
        return null;
      }
    }
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

export async function getRoomPlayerTokenFromCookies(
  code: string,
): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(getRoomPlayerCookieName(code))?.value ?? null;
  } catch {
    return null;
  }
}

export async function getRoomPlayerPayloadFromCookies(
  code: string,
): Promise<RoomPlayerTokenPayload | null> {
  const token = await getRoomPlayerTokenFromCookies(code);
  if (!token) return null;
  return verifyRoomPlayerToken(token);
}

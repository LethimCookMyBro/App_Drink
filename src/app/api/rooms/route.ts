import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { enforceRateLimit, enforceSameOrigin, jsonError, jsonOk } from "@/lib/apiUtils";
import { rateLimitConfigs } from "@/lib/rateLimit";
import { createRoomSchema, sanitizeHtml } from "@/lib/validation";
import { signRoomHostToken, getRoomHostCookieName } from "@/lib/roomAuth";

// Generate 4-character room code
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET /api/rooms - List active rooms (for admin)
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return jsonError("ไม่มีสิทธิ์เข้าถึง", 401);
    }

    const { default: prisma } = await import("@/lib/db");

    const rooms = await prisma.room.findMany({
      where: { isActive: true },
      include: {
        players: true,
        _count: { select: { sessions: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return jsonOk({ rooms });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return jsonOk({
      rooms: [],
      fallback: true,
      message: "ไม่สามารถเชื่อมต่อ Database กรุณาเริ่ม PostgreSQL",
    });
  }
}

// POST /api/rooms - Create a new room
export async function POST(request: NextRequest) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const rateLimited = enforceRateLimit(request, rateLimitConfigs.rooms);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const validation = createRoomSchema.safeParse({
      hostName: body.hostName,
      roomName: body.name ?? body.roomName,
      maxPlayers: body.maxPlayers,
      is18Plus: body.is18Plus,
      difficulty: body.difficulty,
    });

    if (!validation.success) {
      return jsonError(
        validation.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง",
        400,
      );
    }

    const { hostName, roomName, maxPlayers, is18Plus, difficulty } =
      validation.data;

    const name = roomName?.trim() || "Wong Taek Room";
    const safeHostName = sanitizeHtml(hostName);
    const safeRoomName = sanitizeHtml(name);

    const { default: prisma } = await import("@/lib/db");

    // Generate unique room code
    let code = generateRoomCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.room.findUnique({ where: { code } });
      if (!existing) break;
      code = generateRoomCode();
      attempts++;
    }

    const room = await prisma.room.create({
      data: {
        code,
        name: safeRoomName,
        hostId: "", // Will be updated after player creation
        difficulty: Math.min(5, Math.max(1, difficulty)),
        is18Plus,
        maxPlayers,
        players: {
          create: {
            name: safeHostName,
            isHost: true,
            isReady: true,
          },
        },
      },
      include: { players: true },
    });

    const host = room.players[0];
    await prisma.room.update({
      where: { id: room.id },
      data: { hostId: host.id },
    });

    const hostToken = signRoomHostToken({
      roomId: room.id,
      hostId: host.id,
      code,
    });

    const response = jsonOk(
      {
        room: {
          ...room,
          hostId: host.id,
        },
        player: host,
      },
      201,
    );

    response.cookies.set(getRoomHostCookieName(code), hostToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 6, // 6 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error creating room:", error);
    return jsonError(
      "ไม่สามารถสร้างห้องได้",
      500,
      {
        detail:
          "กรุณาเชื่อมต่อ Database ก่อน (Start PostgreSQL และรัน: npx prisma db push)",
      },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

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

    return NextResponse.json({ rooms });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    // Return empty rooms list when database is offline
    return NextResponse.json({
      rooms: [],
      fallback: true,
      message: "ไม่สามารถเชื่อมต่อ Database กรุณาเริ่ม PostgreSQL",
    });
  }
}

// POST /api/rooms - Create a new room
export async function POST(request: NextRequest) {
  try {
    const { default: prisma } = await import("@/lib/db");

    const body = await request.json();
    const {
      name,
      hostName,
      difficulty = 3,
      is18Plus = false,
      maxPlayers = 8,
    } = body;

    if (!name || !hostName) {
      return NextResponse.json(
        { error: "กรุณากรอกชื่อวงและชื่อผู้เล่น" },
        { status: 400 }
      );
    }

    // Generate unique room code
    let code = generateRoomCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.room.findUnique({ where: { code } });
      if (!existing) break;
      code = generateRoomCode();
      attempts++;
    }

    // Create room with host player
    const room = await prisma.room.create({
      data: {
        code,
        name,
        hostId: "", // Will be updated after player creation
        difficulty: Math.min(5, Math.max(1, difficulty)),
        is18Plus,
        maxPlayers: Math.min(20, Math.max(2, maxPlayers)),
        players: {
          create: {
            name: hostName,
            isHost: true,
            isReady: true,
          },
        },
      },
      include: { players: true },
    });

    // Update hostId with the created player's id
    const host = room.players[0];
    await prisma.room.update({
      where: { id: room.id },
      data: { hostId: host.id },
    });

    return NextResponse.json(
      {
        room: {
          ...room,
          hostId: host.id,
        },
        player: host,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      {
        error: "ไม่สามารถสร้างห้องได้",
        detail:
          "กรุณาเชื่อมต่อ Database ก่อน (Start PostgreSQL และรัน: npx prisma db push)",
      },
      { status: 500 }
    );
  }
}

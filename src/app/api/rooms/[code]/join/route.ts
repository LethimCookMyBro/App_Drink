import { NextRequest, NextResponse } from "next/server";

// POST /api/rooms/[code]/join - Join a room
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const roomCode = code.toUpperCase();
    const body = await request.json();
    const { playerName } = body;

    if (!playerName) {
      return NextResponse.json(
        { error: "กรุณากรอกชื่อผู้เล่น" },
        { status: 400 }
      );
    }

    // Dynamic import to prevent crash when database is offline
    const { default: prisma } = await import("@/lib/db");

    // Find room
    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: { players: true },
    });

    if (!room) {
      return NextResponse.json({ error: "ไม่พบห้อง" }, { status: 404 });
    }

    if (!room.isActive) {
      return NextResponse.json({ error: "ห้องนี้ถูกปิดแล้ว" }, { status: 410 });
    }

    if (room.players.length >= room.maxPlayers) {
      return NextResponse.json({ error: "ห้องเต็มแล้ว" }, { status: 400 });
    }

    // Check if name is taken
    const nameTaken = room.players.some(
      (p) => p.name.toLowerCase() === playerName.toLowerCase()
    );
    if (nameTaken) {
      return NextResponse.json(
        { error: "ชื่อนี้ถูกใช้แล้วในห้องนี้" },
        { status: 400 }
      );
    }

    // Create player
    const player = await prisma.player.create({
      data: {
        name: playerName,
        roomId: room.id,
        isHost: false,
        isReady: false,
      },
    });

    // Get updated room
    const updatedRoom = await prisma.room.findUnique({
      where: { id: room.id },
      include: { players: { orderBy: { joinedAt: "asc" } } },
    });

    return NextResponse.json(
      {
        room: updatedRoom,
        player,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error joining room:", error);
    return NextResponse.json(
      {
        error: "ไม่สามารถเข้าร่วมห้องได้",
        detail:
          "กรุณาเชื่อมต่อ Database ก่อน (Start PostgreSQL และรัน: npx prisma db push)",
      },
      { status: 500 }
    );
  }
}

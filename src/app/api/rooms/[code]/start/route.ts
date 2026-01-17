import { NextRequest, NextResponse } from "next/server";

// Valid game modes (inline to avoid import issues when DB is offline)
type GameModeType = "QUESTION" | "VOTE" | "TRUTH_OR_DARE" | "CHAOS" | "MIXED";

// POST /api/rooms/[code]/start - Start a game session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const roomCode = code.toUpperCase();
    const body = await request.json();
    const { mode = "QUESTION", hostId } = body;

    // Validate mode first before database operations
    const validModes: GameModeType[] = [
      "QUESTION",
      "VOTE",
      "TRUTH_OR_DARE",
      "CHAOS",
      "MIXED",
    ];
    if (!validModes.includes(mode as GameModeType)) {
      return NextResponse.json({ error: "โหมดเกมไม่ถูกต้อง" }, { status: 400 });
    }

    // Dynamic import to prevent crash when database is offline
    const { default: prisma } = await import("@/lib/db");

    // Find room
    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: {
        players: true,
        sessions: { where: { status: "ACTIVE" } },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "ไม่พบห้อง" }, { status: 404 });
    }

    if (!room.isActive) {
      return NextResponse.json({ error: "ห้องนี้ถูกปิดแล้ว" }, { status: 410 });
    }

    // Verify host (in real app, use proper auth)
    if (hostId && room.hostId !== hostId) {
      return NextResponse.json(
        { error: "เฉพาะ Host เท่านั้นที่สามารถเริ่มเกมได้" },
        { status: 403 }
      );
    }

    // Check if there's already an active session
    if (room.sessions.length > 0) {
      return NextResponse.json(
        { error: "มีเกมกำลังดำเนินการอยู่แล้ว" },
        { status: 400 }
      );
    }

    // Create game session
    const session = await prisma.gameSession.create({
      data: {
        roomId: room.id,
        mode: mode as GameModeType,
        status: "ACTIVE",
      },
    });

    return NextResponse.json(
      {
        session,
        message: "เริ่มเกมแล้ว!",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error starting game:", error);
    return NextResponse.json(
      {
        error: "ไม่สามารถเริ่มเกมได้",
        detail:
          "กรุณาเชื่อมต่อ Database ก่อน (Start PostgreSQL และรัน: npx prisma db push)",
      },
      { status: 500 }
    );
  }
}

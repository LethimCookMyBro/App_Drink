import { NextRequest, NextResponse } from "next/server";

// GET /api/rooms/[code] - Get room by code
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const roomCode = code.toUpperCase();

    // Dynamic import to prevent crash when database is offline
    const { default: prisma } = await import("@/lib/db");

    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: {
        players: {
          orderBy: { joinedAt: "asc" },
        },
        sessions: {
          where: { status: "ACTIVE" },
          take: 1,
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "ไม่พบห้อง" }, { status: 404 });
    }

    if (!room.isActive) {
      return NextResponse.json({ error: "ห้องนี้ถูกปิดแล้ว" }, { status: 410 });
    }

    return NextResponse.json({ room });
  } catch (error) {
    console.error("Error fetching room:", error);
    return NextResponse.json(
      {
        error: "ไม่สามารถดึงข้อมูลห้องได้",
        detail:
          "กรุณาเชื่อมต่อ Database ก่อน (Start PostgreSQL และรัน: npx prisma db push)",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/rooms/[code] - Close room (host only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const roomCode = code.toUpperCase();

    // Dynamic import to prevent crash when database is offline
    const { default: prisma } = await import("@/lib/db");

    // In real app, verify host authorization here
    const room = await prisma.room.update({
      where: { code: roomCode },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "ห้องถูกปิดแล้ว", room });
  } catch (error) {
    console.error("Error closing room:", error);
    return NextResponse.json(
      {
        error: "ไม่สามารถปิดห้องได้",
        detail:
          "กรุณาเชื่อมต่อ Database ก่อน (Start PostgreSQL และรัน: npx prisma db push)",
      },
      { status: 500 }
    );
  }
}

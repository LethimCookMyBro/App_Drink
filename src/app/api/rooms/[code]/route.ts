import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/rooms/[code] - Get room by code
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const roomCode = code.toUpperCase();

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
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (!room.isActive) {
      return NextResponse.json(
        { error: "Room is no longer active" },
        { status: 410 }
      );
    }

    return NextResponse.json({ room });
  } catch (error) {
    console.error("Error fetching room:", error);
    return NextResponse.json(
      { error: "Failed to fetch room" },
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

    // In real app, verify host authorization here
    const room = await prisma.room.update({
      where: { code: roomCode },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "Room closed", room });
  } catch (error) {
    console.error("Error closing room:", error);
    return NextResponse.json(
      { error: "Failed to close room" },
      { status: 500 }
    );
  }
}

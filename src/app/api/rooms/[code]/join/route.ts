import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

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
        { error: "Player name is required" },
        { status: 400 }
      );
    }

    // Find room
    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: { players: true },
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

    if (room.players.length >= room.maxPlayers) {
      return NextResponse.json({ error: "Room is full" }, { status: 400 });
    }

    // Check if name is taken
    const nameTaken = room.players.some(
      (p) => p.name.toLowerCase() === playerName.toLowerCase()
    );
    if (nameTaken) {
      return NextResponse.json(
        { error: "Name already taken in this room" },
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
    return NextResponse.json({ error: "Failed to join room" }, { status: 500 });
  }
}

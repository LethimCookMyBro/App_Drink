import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { GameMode } from "@prisma/client";

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

    // Find room
    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: {
        players: true,
        sessions: { where: { status: "ACTIVE" } },
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

    // Verify host (in real app, use proper auth)
    if (hostId && room.hostId !== hostId) {
      return NextResponse.json(
        { error: "Only host can start the game" },
        { status: 403 }
      );
    }

    // Check if there's already an active session
    if (room.sessions.length > 0) {
      return NextResponse.json(
        { error: "A game is already in progress" },
        { status: 400 }
      );
    }

    // Validate mode
    const validModes: GameMode[] = [
      "QUESTION",
      "VOTE",
      "TRUTH_OR_DARE",
      "CHAOS",
      "MIXED",
    ];
    if (!validModes.includes(mode as GameMode)) {
      return NextResponse.json({ error: "Invalid game mode" }, { status: 400 });
    }

    // Create game session
    const session = await prisma.gameSession.create({
      data: {
        roomId: room.id,
        mode: mode as GameMode,
        status: "ACTIVE",
      },
    });

    return NextResponse.json(
      {
        session,
        message: "Game started!",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error starting game:", error);
    return NextResponse.json(
      { error: "Failed to start game" },
      { status: 500 }
    );
  }
}

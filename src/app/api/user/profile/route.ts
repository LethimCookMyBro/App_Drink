import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession, getTokenFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const token = getTokenFromRequest(request);

    if (!token) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const session = await validateSession(token);

    if (!session) {
      return NextResponse.json(
        { error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" },
        { status: 401 }
      );
    }

    // Get user's game stats
    const gameSessions = await prisma.gameSession.findMany({
      where: {
        userId: session.user.id,
        status: "COMPLETED",
      },
      include: {
        events: true,
      },
    });

    // Calculate statistics
    const totalGames = gameSessions.length;

    let totalDrinks = 0;
    let totalPlayTimeMs = 0;

    for (const gameSession of gameSessions) {
      const drinkEvents = gameSession.events.filter(
        (e) => e.type === "DRANK" || e.type === "SKIPPED"
      );
      totalDrinks += drinkEvents.length;

      if (gameSession.endedAt) {
        totalPlayTimeMs +=
          new Date(gameSession.endedAt).getTime() -
          new Date(gameSession.startedAt).getTime();
      }
    }

    const totalPlayTimeHours =
      Math.round((totalPlayTimeMs / (1000 * 60 * 60)) * 10) / 10;

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        avatarUrl: session.user.avatarUrl,
        createdAt: session.user.createdAt,
      },
      stats: {
        totalGames,
        totalDrinks,
        totalPlayTime: totalPlayTimeHours,
      },
    });
  } catch (error) {
    console.error("Profile error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูล" },
      { status: 500 }
    );
  }
}

// Update user profile
export async function PATCH(request: Request) {
  try {
    const token = getTokenFromRequest(request);

    if (!token) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const session = await validateSession(token);

    if (!session) {
      return NextResponse.json(
        { error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, avatarUrl } = body;

    // Validate name
    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        name.trim().length < 1 ||
        name.length > 50
      ) {
        return NextResponse.json(
          { error: "ชื่อต้องมี 1-50 ตัวอักษร" },
          { status: 400 }
        );
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการอัพเดทข้อมูล" },
      { status: 500 }
    );
  }
}

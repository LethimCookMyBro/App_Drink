import { Prisma, type PrismaClient } from "@prisma/client";
import type {
  RoomHostTokenPayload,
  RoomPlayerTokenPayload,
} from "@/backend/roomAuth";

type RoomDbClient = PrismaClient | Prisma.TransactionClient;

export const ROOM_PLAYER_SELECT = {
  id: true,
  name: true,
  isHost: true,
  isReady: true,
} satisfies Prisma.PlayerSelect;

export const ROOM_SUMMARY_SELECT = {
  code: true,
  name: true,
  maxPlayers: true,
  isActive: true,
  players: {
    orderBy: { joinedAt: "asc" },
    select: ROOM_PLAYER_SELECT,
  },
} satisfies Prisma.RoomSelect;

export const ROOM_HOST_ACCESS_SELECT = {
  id: true,
  code: true,
  name: true,
  hostId: true,
  maxPlayers: true,
  isActive: true,
} satisfies Prisma.RoomSelect;

const ROOM_PARTICIPANT_ACCESS_SELECT = {
  id: true,
  hostId: true,
  isActive: true,
} satisfies Prisma.RoomSelect;

type RoomAccessFailure =
  | "unauthorized"
  | "not_found"
  | "inactive"
  | "forbidden";

export type RoomSummaryRecord = Prisma.RoomGetPayload<{
  select: typeof ROOM_SUMMARY_SELECT;
}>;

export type HostManagedRoomRecord = Prisma.RoomGetPayload<{
  select: typeof ROOM_HOST_ACCESS_SELECT;
}>;

type ParticipantAccessibleRoom = Prisma.RoomGetPayload<{
  select: typeof ROOM_PARTICIPANT_ACCESS_SELECT;
}>;

export function normalizePlayerNameKey(playerName: string): string {
  return playerName.trim().toLocaleLowerCase();
}

export async function getRoomSummaryById(
  prisma: RoomDbClient,
  roomId: string,
): Promise<RoomSummaryRecord | null> {
  return prisma.room.findUnique({
    where: { id: roomId },
    select: ROOM_SUMMARY_SELECT,
  });
}

export async function getRoomSummaryByCode(
  prisma: RoomDbClient,
  roomCode: string,
): Promise<RoomSummaryRecord | null> {
  return prisma.room.findUnique({
    where: { code: roomCode },
    select: ROOM_SUMMARY_SELECT,
  });
}

export async function requireRoomHost(
  prisma: RoomDbClient,
  roomCode: string,
  payload: RoomHostTokenPayload | null,
): Promise<
  | { kind: "ok"; room: HostManagedRoomRecord }
  | { kind: RoomAccessFailure }
> {
  if (!payload || payload.code !== roomCode) {
    return { kind: "unauthorized" };
  }

  const room = await prisma.room.findUnique({
    where: { code: roomCode },
    select: ROOM_HOST_ACCESS_SELECT,
  });

  if (!room) {
    return { kind: "not_found" };
  }

  if (!room.isActive) {
    return { kind: "inactive" };
  }

  if (room.id !== payload.roomId || room.hostId !== payload.hostId) {
    return { kind: "forbidden" };
  }

  return { kind: "ok", room };
}

export async function requireRoomParticipant(
  prisma: RoomDbClient,
  roomCode: string,
  hostPayload: RoomHostTokenPayload | null,
  playerPayload: RoomPlayerTokenPayload | null,
): Promise<
  | {
      kind: "ok";
      room: ParticipantAccessibleRoom;
      canManageLobby: boolean;
    }
  | { kind: RoomAccessFailure }
> {
  if (!hostPayload && !playerPayload) {
    return { kind: "unauthorized" };
  }

  const room = await prisma.room.findUnique({
    where: { code: roomCode },
    select: ROOM_PARTICIPANT_ACCESS_SELECT,
  });

  if (!room) {
    return { kind: "not_found" };
  }

  if (!room.isActive) {
    return { kind: "inactive" };
  }

  const hostAuthorized =
    !!hostPayload &&
    hostPayload.code === roomCode &&
    hostPayload.roomId === room.id &&
    hostPayload.hostId === room.hostId;

  if (hostAuthorized) {
    return { kind: "ok", room, canManageLobby: true };
  }

  const playerAuthorized =
    !!playerPayload &&
    playerPayload.code === roomCode &&
    playerPayload.roomId === room.id &&
    (await prisma.player.findFirst({
      where: {
        id: playerPayload.playerId,
        roomId: room.id,
      },
      select: { id: true },
    }));

  if (!playerAuthorized) {
    return { kind: "forbidden" };
  }

  return { kind: "ok", room, canManageLobby: false };
}

export async function addPlayerToRoom(
  prisma: Prisma.TransactionClient,
  room: HostManagedRoomRecord,
  playerName: string,
  isReady: boolean,
): Promise<
  | { kind: "created"; player: Prisma.PlayerGetPayload<{ select: typeof ROOM_PLAYER_SELECT }>; roomSummary: RoomSummaryRecord }
  | { kind: "full" | "name_taken" | "room_missing" }
> {
  const nameKey = normalizePlayerNameKey(playerName);

  const [playerCount, duplicatePlayer] = await Promise.all([
    prisma.player.count({
      where: { roomId: room.id },
    }),
    prisma.player.findFirst({
      where: {
        roomId: room.id,
        nameKey,
      },
      select: { id: true },
    }),
  ]);

  if (playerCount >= room.maxPlayers) {
    return { kind: "full" };
  }

  if (duplicatePlayer) {
    return { kind: "name_taken" };
  }

  const player = await prisma.player.create({
    data: {
      name: playerName,
      nameKey,
      roomId: room.id,
      isHost: false,
      isReady,
    },
    select: ROOM_PLAYER_SELECT,
  });

  const roomSummary = await getRoomSummaryById(prisma, room.id);
  if (!roomSummary) {
    return { kind: "room_missing" };
  }

  return { kind: "created", player, roomSummary };
}

export async function removePlayerFromRoom(
  prisma: Prisma.TransactionClient,
  room: HostManagedRoomRecord,
  playerId: string,
): Promise<
  | { kind: "removed"; roomSummary: RoomSummaryRecord }
  | { kind: "player_not_found" | "cannot_remove_host" | "room_missing" }
> {
  const player = await prisma.player.findFirst({
    where: {
      id: playerId,
      roomId: room.id,
    },
    select: {
      id: true,
      isHost: true,
    },
  });

  if (!player) {
    return { kind: "player_not_found" };
  }

  if (player.isHost) {
    return { kind: "cannot_remove_host" };
  }

  await prisma.player.delete({
    where: { id: player.id },
  });

  const roomSummary = await getRoomSummaryById(prisma, room.id);
  if (!roomSummary) {
    return { kind: "room_missing" };
  }

  return { kind: "removed", roomSummary };
}

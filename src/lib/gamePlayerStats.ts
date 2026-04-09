import type { StoredPlayerStat } from "@/lib/gameSession";

export type PlayerCountMap = Record<string, number>;

export function syncPlayerCountMap(
  players: string[],
  current: PlayerCountMap = {},
): PlayerCountMap {
  if (players.length === 0) {
    return {};
  }

  return Object.fromEntries(
    players.map((player) => [player, current[player] ?? 0]),
  );
}

export function getPlayerCount(
  counts: PlayerCountMap,
  playerName: string,
): number {
  return playerName ? counts[playerName] ?? 0 : 0;
}

export function incrementPlayerCount(
  counts: PlayerCountMap,
  playerName: string,
  amount = 1,
): PlayerCountMap {
  if (!playerName) {
    return counts;
  }

  return {
    ...counts,
    [playerName]: (counts[playerName] ?? 0) + amount,
  };
}

export function buildStoredPlayerStats(
  players: string[],
  drinkCounts: PlayerCountMap,
  questionCounts: PlayerCountMap,
): StoredPlayerStat[] {
  return players.map((name) => ({
    name,
    drinkCount: drinkCounts[name] ?? 0,
    questionsAnswered: questionCounts[name] ?? 0,
  }));
}

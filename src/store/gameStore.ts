import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";

// Types
export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  drinkCount: number;
  avatarGradient?: string;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  hostId: string;
  difficulty: number; // 1-5
  is18Plus: boolean;
  maxPlayers: number;
  players: Player[];
  createdAt: Date;
}

export interface Question {
  id: string;
  text: string;
  type: "question" | "truth" | "dare" | "chaos" | "vote";
  level: 1 | 2 | 3; // 1=chill, 2=mid, 3=spicy
  is18Plus: boolean;
}

export type GamePhase = "idle" | "lobby" | "selecting" | "playing" | "summary";
export type GameMode = "question" | "vote" | "truth-or-dare" | "chaos";
export type VibeLevel = "chilling" | "tipsy" | "chaos";

interface GameState {
  // Room state
  room: Room | null;
  currentPlayer: Player | null;

  // Game state
  gamePhase: GamePhase;
  gameMode: GameMode | null;
  currentQuestion: Question | null;
  currentTurnPlayerId: string | null;
  roundNumber: number;
  timer: number;

  // User preferences
  vibeLevel: VibeLevel;
  soundEnabled: boolean;
  vibrationEnabled: boolean;

  // Actions
  setVibeLevel: (level: VibeLevel) => void;
  createRoom: (
    name: string,
    hostName: string,
    difficulty: number,
    is18Plus: boolean,
    maxPlayers: number
  ) => void;
  joinRoom: (code: string, playerName: string) => boolean;
  leaveRoom: () => void;
  setPlayerReady: (playerId: string, isReady: boolean) => void;
  startGame: (mode: GameMode) => void;
  setCurrentQuestion: (question: Question) => void;
  nextTurn: () => void;
  playerDrank: (playerId: string) => void;
  endGame: () => void;
  reset: () => void;
}

// Generate 4-character room code
const generateRoomCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // Initial state
      room: null,
      currentPlayer: null,
      gamePhase: "idle",
      gameMode: null,
      currentQuestion: null,
      currentTurnPlayerId: null,
      roundNumber: 0,
      timer: 30,
      vibeLevel: "tipsy",
      soundEnabled: true,
      vibrationEnabled: true,

      // Actions
      setVibeLevel: (level) => set({ vibeLevel: level }),

      createRoom: (name, hostName, difficulty, is18Plus, maxPlayers) => {
        const hostId = uuidv4();
        const host: Player = {
          id: hostId,
          name: hostName,
          isHost: true,
          isReady: true,
          drinkCount: 0,
        };

        const room: Room = {
          id: uuidv4(),
          code: generateRoomCode(),
          name,
          hostId,
          difficulty,
          is18Plus,
          maxPlayers,
          players: [host],
          createdAt: new Date(),
        };

        set({
          room,
          currentPlayer: host,
          gamePhase: "lobby",
        });
      },

      joinRoom: (code, playerName) => {
        const { room } = get();
        if (!room || room.code !== code) return false;
        if (room.players.length >= room.maxPlayers) return false;

        const newPlayer: Player = {
          id: uuidv4(),
          name: playerName,
          isHost: false,
          isReady: false,
          drinkCount: 0,
        };

        set({
          room: {
            ...room,
            players: [...room.players, newPlayer],
          },
          currentPlayer: newPlayer,
          gamePhase: "lobby",
        });

        return true;
      },

      leaveRoom: () => {
        const { room, currentPlayer } = get();
        if (!room || !currentPlayer) return;

        const updatedPlayers = room.players.filter(
          (p) => p.id !== currentPlayer.id
        );

        // If host leaves, assign new host or close room
        if (currentPlayer.isHost && updatedPlayers.length > 0) {
          updatedPlayers[0].isHost = true;
        }

        if (updatedPlayers.length === 0) {
          set({ room: null, currentPlayer: null, gamePhase: "idle" });
        } else {
          set({
            room: {
              ...room,
              players: updatedPlayers,
              hostId: updatedPlayers[0].id,
            },
            currentPlayer: null,
            gamePhase: "idle",
          });
        }
      },

      setPlayerReady: (playerId, isReady) => {
        const { room } = get();
        if (!room) return;

        set({
          room: {
            ...room,
            players: room.players.map((p) =>
              p.id === playerId ? { ...p, isReady } : p
            ),
          },
        });
      },

      startGame: (mode) => {
        const { room } = get();
        if (!room) return;

        set({
          gameMode: mode,
          gamePhase: "playing",
          roundNumber: 1,
          currentTurnPlayerId: room.players[0].id,
        });
      },

      setCurrentQuestion: (question) => set({ currentQuestion: question }),

      nextTurn: () => {
        const { room, currentTurnPlayerId, roundNumber } = get();
        if (!room) return;

        const currentIndex = room.players.findIndex(
          (p) => p.id === currentTurnPlayerId
        );
        const nextIndex = (currentIndex + 1) % room.players.length;
        const newRound = nextIndex === 0 ? roundNumber + 1 : roundNumber;

        set({
          currentTurnPlayerId: room.players[nextIndex].id,
          roundNumber: newRound,
          currentQuestion: null,
          timer: 30,
        });
      },

      playerDrank: (playerId) => {
        const { room } = get();
        if (!room) return;

        set({
          room: {
            ...room,
            players: room.players.map((p) =>
              p.id === playerId ? { ...p, drinkCount: p.drinkCount + 1 } : p
            ),
          },
        });
      },

      endGame: () => set({ gamePhase: "summary" }),

      reset: () =>
        set({
          room: null,
          currentPlayer: null,
          gamePhase: "idle",
          gameMode: null,
          currentQuestion: null,
          currentTurnPlayerId: null,
          roundNumber: 0,
          timer: 30,
        }),
    }),
    {
      name: "wong-taek-game",
      partialize: (state) => ({
        vibeLevel: state.vibeLevel,
        soundEnabled: state.soundEnabled,
        vibrationEnabled: state.vibrationEnabled,
      }),
    }
  )
);

export default useGameStore;

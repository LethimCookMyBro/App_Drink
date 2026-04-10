"use client";

import { motion } from "framer-motion";

interface PlayerAvatarProps {
  name: string;
  isHost?: boolean;
  isReady?: boolean;
  isCurrentTurn?: boolean;
  size?: "sm" | "md" | "lg";
  gradient?: string;
  className?: string;
}

const gradients = [
  "from-[#c73df5] to-[#4a0072]",
  "from-blue-500 to-cyan-400",
  "from-orange-500 to-pink-600",
  "from-emerald-500 to-teal-800",
  "from-rose-500 to-red-600",
  "from-amber-500 to-yellow-600",
  "from-indigo-500 to-purple-600",
  "from-lime-500 to-green-600",
];

const sizes = {
  sm: "size-10",
  md: "size-16",
  lg: "size-24",
};

const textSizes = {
  sm: "text-sm",
  md: "text-2xl",
  lg: "text-4xl",
};

export function PlayerAvatar({
  name,
  isHost = false,
  isReady = false,
  isCurrentTurn = false,
  size = "md",
  gradient,
  className = "",
}: PlayerAvatarProps) {
  // Generate consistent gradient based on name
  const gradientIndex = name.charCodeAt(0) % gradients.length;
  const avatarGradient = gradient || gradients[gradientIndex];
  const initial = name.charAt(0).toUpperCase();

  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Glow effect for current turn */}
      {isCurrentTurn && (
        <motion.div
          className="absolute -inset-1 rounded-full bg-gradient-to-b from-primary to-transparent opacity-50 blur-md"
          animate={{ opacity: [0.5, 0.75, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Avatar */}
      <div
        className={`
          ${sizes[size]} rounded-lg bg-gradient-to-br ${avatarGradient}
          flex items-center justify-center shadow-lg
          ${
            isCurrentTurn
              ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
              : ""
          }
        `}
      >
        <span className={`${textSizes[size]} font-bold text-white`}>
          {initial}
        </span>
      </div>

      {/* Host Crown */}
      {isHost && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="material-symbols-outlined text-neon-yellow drop-shadow-[0_0_10px_rgba(250,204,21,0.8)] text-xl material-symbols-filled">
            crown
          </span>
        </div>
      )}

      {/* Ready Status */}
      {isReady && !isHost && (
        <div className="absolute -bottom-1 -right-1">
          <div className="size-5 rounded-full bg-neon-green flex items-center justify-center shadow-neon-green">
            <span className="material-symbols-outlined text-black text-sm">
              check
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default PlayerAvatar;

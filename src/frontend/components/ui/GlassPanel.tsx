"use client";

import { ReactNode } from "react";
import { motion, HTMLMotionProps } from "framer-motion";

type GlassVariant = "default" | "purple" | "blue" | "red" | "green";

interface GlassPanelProps extends Omit<HTMLMotionProps<"div">, "children"> {
  variant?: GlassVariant;
  glow?: boolean;
  children: ReactNode;
}

const variantStyles: Record<GlassVariant, string> = {
  default: "border-white/5",
  purple: "border-primary/30 shadow-neon-purple",
  blue: "border-neon-blue/30 shadow-neon-blue",
  red: "border-neon-red/30 shadow-neon-red",
  green: "border-neon-green/30 shadow-neon-green",
};

export function GlassPanel({
  variant = "default",
  glow = false,
  className = "",
  children,
  ...props
}: GlassPanelProps) {
  return (
    <motion.div
      className={`
        glass-panel rounded-2xl border p-5
        ${variantStyles[variant]}
        ${glow ? "animate-pulse-glow" : ""}
        ${className}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export default GlassPanel;

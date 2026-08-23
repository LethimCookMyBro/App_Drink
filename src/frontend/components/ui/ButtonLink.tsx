"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { Icon, type IconName } from "@/frontend/components/ui/Icon";

type ButtonVariant =
  | "primary"
  | "outline"
  | "neon-blue"
  | "neon-red"
  | "neon-green"
  | "ghost";
type ButtonSize = "sm" | "md" | "lg" | "xl";

interface ButtonLinkProps {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-neon-purple hover:brightness-110 active:scale-[0.98]",
  outline:
    "bg-transparent border-2 border-white/20 text-white hover:bg-white/5 active:scale-[0.98]",
  "neon-blue":
    "bg-transparent border-2 border-neon-blue text-neon-blue shadow-neon-blue hover:bg-neon-blue/10 active:scale-[0.98]",
  "neon-red":
    "bg-neon-red text-white shadow-[0_4px_0_#990026,0_10px_20px_rgba(255,0,64,0.3)] active:shadow-none active:translate-y-[4px]",
  "neon-green":
    "bg-neon-green text-black shadow-[0_4px_0_#4d9900,0_10px_20px_rgba(128,255,0,0.3)] active:shadow-none active:translate-y-[4px]",
  ghost:
    "bg-white/5 text-white/80 border border-white/10 hover:bg-white/10 hover:text-white active:scale-[0.95]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm rounded-lg gap-1.5",
  md: "h-12 px-5 text-base rounded-xl gap-2",
  lg: "h-14 px-6 text-lg rounded-xl gap-2.5",
  xl: "h-[72px] px-8 text-xl rounded-2xl gap-3",
};

export function ButtonLink({
  href,
  variant = "primary",
  size = "lg",
  icon,
  iconPosition = "left",
  fullWidth = false,
  children,
  className = "",
  "aria-label": ariaLabel,
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={`
        relative overflow-hidden inline-flex items-center justify-center
        font-bold tracking-wide transition-all duration-200
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
    >
      {variant === "primary" && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:animate-shimmer pointer-events-none" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
      <span className="relative z-10 flex items-center gap-2">
        {icon && iconPosition === "left" && (
          <Icon name={icon} className="text-current" />
        )}
        {children}
        {icon && iconPosition === "right" && (
          <Icon name={icon} className="text-current" />
        )}
      </span>
    </Link>
  );
}

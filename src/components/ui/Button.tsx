"use client";

import { forwardRef, ButtonHTMLAttributes } from "react";
import { motion, HTMLMotionProps } from "framer-motion";

type ButtonVariant =
  | "primary"
  | "outline"
  | "neon-blue"
  | "neon-red"
  | "neon-green"
  | "ghost";
type ButtonSize = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  loading?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: `
    bg-primary text-white shadow-neon-purple
    hover:brightness-110 active:scale-[0.98]
  `,
  outline: `
    bg-transparent border-2 border-white/20 text-white
    hover:bg-white/5 active:scale-[0.98]
  `,
  "neon-blue": `
    bg-transparent border-2 border-neon-blue text-neon-blue shadow-neon-blue
    hover:bg-neon-blue/10 active:scale-[0.98]
  `,
  "neon-red": `
    bg-neon-red text-white 
    shadow-[0_4px_0_#990026,0_10px_20px_rgba(255,0,64,0.3)]
    active:shadow-none active:translate-y-[4px]
  `,
  "neon-green": `
    bg-neon-green text-black
    shadow-[0_4px_0_#4d9900,0_10px_20px_rgba(128,255,0,0.3)]
    active:shadow-none active:translate-y-[4px]
  `,
  ghost: `
    bg-white/5 text-white/80 border border-white/10
    hover:bg-white/10 hover:text-white active:scale-[0.95]
  `,
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm rounded-lg gap-1.5",
  md: "h-12 px-5 text-base rounded-xl gap-2",
  lg: "h-14 px-6 text-lg rounded-xl gap-2.5",
  xl: "h-[72px] px-8 text-xl rounded-2xl gap-3",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "lg",
      icon,
      iconPosition = "left",
      fullWidth = false,
      loading = false,
      className = "",
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses = `
      relative overflow-hidden inline-flex items-center justify-center
      font-bold tracking-wide transition-all duration-200
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    return (
      <motion.button
        ref={ref}
        className={`
          ${baseClasses}
          ${variants[variant]}
          ${sizes[size]}
          ${fullWidth ? "w-full" : ""}
          ${className}
        `}
        disabled={disabled || loading}
        whileTap={{
          scale: variant === "neon-red" || variant === "neon-green" ? 1 : 0.98,
        }}
        {...props}
      >
        {/* Shimmer effect for primary */}
        {variant === "primary" && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:animate-shimmer pointer-events-none" />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />

        {/* Content */}
        <span className="relative z-10 flex items-center gap-2">
          {loading ? (
            <span className="material-symbols-outlined animate-spin text-current">
              progress_activity
            </span>
          ) : (
            <>
              {icon && iconPosition === "left" && (
                <span className="material-symbols-outlined text-current">
                  {icon}
                </span>
              )}
              {children}
              {icon && iconPosition === "right" && (
                <span className="material-symbols-outlined text-current">
                  {icon}
                </span>
              )}
            </>
          )}
        </span>
      </motion.button>
    );
  }
);

Button.displayName = "Button";

export default Button;

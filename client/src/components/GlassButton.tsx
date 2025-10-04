import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "purple";
}

export function GlassButton({ 
  children, 
  className, 
  variant = "default",
  ...props 
}: GlassButtonProps) {
  return (
    <button
      className={cn(
        "relative rounded-xl backdrop-blur-xl border transition-all duration-300",
        "hover:scale-105 active:scale-95",
        variant === "default" && [
          "bg-white/5 border-white/10",
          "hover:bg-white/10 hover:border-white/20",
          "shadow-2xl hover:shadow-[0_8px_32px_rgba(124,60,236,0.25)]",
          "text-white font-semibold"
        ],
        variant === "purple" && [
          "bg-violet-600/20 border-violet-500/30",
          "hover:bg-violet-600/30 hover:border-violet-500/50",
          "shadow-2xl shadow-violet-600/20 hover:shadow-violet-600/40",
          "text-violet-100 font-bold"
        ],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

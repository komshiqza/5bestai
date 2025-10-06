import React from 'react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export function GlassButton({ 
  children, 
  className = '', 
  variant = 'primary',
  ...props 
}: GlassButtonProps) {
  const baseClasses = `
    rounded-lg 
    bg-background-dark/80 
    backdrop-blur-sm 
    border 
    border-primary/30 
    text-white 
    font-bold 
    transition-all 
    duration-300 
    focus-ring 
    hover:border-primary/70
    glow-border 
    px-6 
    py-3 
    text-base
    shadow-lg 
    shadow-primary/20
    hover:shadow-xl 
    hover:shadow-primary/60
    hover:scale-105
    hover:bg-primary/20
    active:scale-95
    transform
    relative
    overflow-hidden
    group
    hover:shadow-[0_0_20px_rgba(124,60,236,0.6)]
  `;

  const variantClasses = {
    primary: 'hover:bg-primary/20',
    secondary: 'bg-background-dark/60 hover:bg-background-dark/80'
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`.trim()}
      {...props}
    >
      {/* Enhanced glow border overlay on hover */}
      <div className="absolute inset-0 rounded-lg border border-transparent group-hover:border-primary/80 group-hover:shadow-[0_0_15px_rgba(124,60,236,0.8),inset_0_0_15px_rgba(124,60,236,0.2)] transition-all duration-300" />
      
      {/* Shimmer effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
      
      {/* Button content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
}
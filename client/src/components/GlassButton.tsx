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
  const baseClasses = variant === 'primary' 
    ? 'glass btn-primary rounded-lg text-white font-bold px-6 py-3 text-base focus-ring'
    : 'glass btn-secondary rounded-lg text-white font-bold px-6 py-3 text-base focus-ring';

  return (
    <button
      className={`${baseClasses} ${className}`.trim()}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
}
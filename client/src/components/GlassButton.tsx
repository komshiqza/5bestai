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
  const baseClasses = [
    'rounded-lg',
    'bg-background-dark/80',
    'backdrop-blur-sm',
    'border',
    'border-primary/30',
    'text-white',
    'font-bold',
    'transition-all',
    'duration-300',
    'focus-ring',
    'hover:border-primary/50',
    'glow-border',
    'px-6',
    'py-3',
    'text-base'
  ].join(' ');

  const variantClasses = variant === 'secondary' 
    ? 'hover:bg-primary/10' 
    : 'hover:bg-primary/20';

  const combinedClasses = `${baseClasses} ${variantClasses} ${className}`.trim();

  return (
    <button className={combinedClasses} {...props}>
      {children}
    </button>
  );
}
import { forwardRef } from 'react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ children, className = '', variant = 'primary', ...props }, ref) => {
    const baseClasses = variant === 'primary' 
      ? 'glass glow-border btn-primary rounded-lg text-white font-bold px-6 py-3 text-base focus-ring'
      : 'glass glow-border btn-secondary rounded-lg text-white font-bold px-6 py-3 text-base focus-ring';

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${className}`.trim()}
        {...props}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>
      </button>
    );
  }
);

GlassButton.displayName = 'GlassButton';
import React from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  loadingText?: string;
  icon?: ReactNode;
  children: ReactNode;
  preventDoubleClick?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  loading = false,
  loadingText,
  icon,
  children,
  className,
  disabled,
  preventDoubleClick = true,
  onClick,
  type = "button", // Always default to button to prevent form submissions
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 border border-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };

  const sizeClasses = {
    small: 'px-2.5 py-1.5 text-xs',
    medium: 'px-4 py-2 text-sm',
    large: 'px-6 py-3 text-base',
  };

  // Helper function to combine class names
  const cn = (...classes: (string | Record<string, boolean> | undefined)[]) => {
    return classes
      .flatMap(c => {
        if (typeof c === 'string') return c;
        if (!c) return '';
        return Object.entries(c)
          .filter(([_, value]) => Boolean(value))
          .map(([key]) => key);
      })
      .filter(Boolean)
      .join(' ');
  };
  
  // Prevent double-click handler
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      if (preventDoubleClick) {
        // This creates a closure that disables the button immediately after click
        const target = e.currentTarget;
        target.disabled = true;
        
        // Allow the event to propagate, then re-enable after a short delay
        // This prevents double-clicks while allowing the button to be used again
        setTimeout(() => {
          if (target && !loading && !disabled) {
            target.disabled = false;
          }
        }, 500);
      }
      
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        { 'opacity-50 cursor-not-allowed': disabled || loading },
        className
      )}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {loadingText || children}
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

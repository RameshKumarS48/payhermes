'use client';

import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-md border',
          'focus:outline-none focus:ring-2 focus:ring-navy-300 focus:ring-offset-1',
          'disabled:opacity-50 disabled:pointer-events-none',
          {
            'bg-navy-900 text-white border-navy-900 hover:bg-navy-800 shadow-sm':
              variant === 'primary',
            'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 shadow-sm':
              variant === 'secondary',
            'bg-transparent text-gray-600 border-transparent hover:bg-gray-100':
              variant === 'ghost',
            'bg-red-600 text-white border-red-600 hover:bg-red-700 shadow-sm':
              variant === 'danger',
          },
          {
            'text-xs px-2.5 py-1.5': size === 'sm',
            'text-sm px-4 py-2': size === 'md',
            'text-base px-6 py-2.5': size === 'lg',
          },
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

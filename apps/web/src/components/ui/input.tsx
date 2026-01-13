'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Search } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      inputSize = 'md',
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const inputId = id || `input-${React.useId()}`;
    const isPassword = type === 'password';
    const isSearch = type === 'search';

    const sizes = {
      sm: 'h-10 text-sm px-3',
      md: 'h-12 text-base px-3.5',
      lg: 'h-14 text-lg px-4',
    };

    const labelSizes = {
      sm: 'text-[13px]',
      md: 'text-sm',
      lg: 'text-base',
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block font-medium text-foreground mb-2',
              labelSizes[inputSize],
              disabled && 'text-muted-foreground'
            )}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {(leftIcon || isSearch) && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              {isSearch ? <Search className="w-5 h-5" /> : leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={isPassword && showPassword ? 'text' : type}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            className={cn(
              'flex w-full rounded-md border bg-background',
              'text-foreground placeholder:text-muted-foreground',
              'ring-offset-background transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-accent',
              sizes[inputSize],
              (leftIcon || isSearch) && 'pl-11',
              (rightIcon || isPassword) && 'pr-11',
              error
                ? 'border-destructive focus-visible:ring-destructive/20'
                : 'border-input hover:border-muted-foreground/50',
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors touch-target flex items-center justify-center"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          )}
          {rightIcon && !isPassword && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              {rightIcon}
            </div>
          )}
        </div>
        {(error || helperText) && (
          <p
            id={error ? `${inputId}-error` : `${inputId}-helper`}
            className={cn(
              'mt-2 text-sm',
              error ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };

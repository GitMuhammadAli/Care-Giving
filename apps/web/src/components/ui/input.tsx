'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);
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

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block font-medium mb-2 transition-colors duration-150',
              labelSizes[inputSize],
              disabled ? 'text-muted-foreground' : isFocused ? 'text-sage-700' : 'text-foreground'
            )}
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {/* Left icon */}
          {(leftIcon || isSearch) && (
            <div 
              className={cn(
                'absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-150',
                isFocused ? 'text-sage-700' : 'text-muted-foreground'
              )}
            >
              {isSearch ? <Search className="w-5 h-5" /> : leftIcon}
            </div>
          )}
          
          {/* Input field */}
          <input
            ref={ref}
            id={inputId}
            type={isPassword && showPassword ? 'text' : type}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(
              'flex w-full rounded-lg border bg-background',
              'text-foreground placeholder:text-muted-foreground/60',
              'transition-all duration-150 ease-out',
              'focus-visible:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-accent',
              sizes[inputSize],
              (leftIcon || isSearch) && 'pl-11',
              (rightIcon || isPassword) && 'pr-11',
              error
                ? 'border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20'
                : 'border-sage-200 hover:border-sage-400 focus:border-sage-700 focus:ring-2 focus:ring-sage-700/10',
              className
            )}
            style={{
              willChange: isFocused ? 'border-color, box-shadow' : 'auto',
            }}
            {...props}
          />
          
          {/* Password toggle */}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-150 touch-target flex items-center justify-center"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          )}
          
          {/* Right icon */}
          {rightIcon && !isPassword && (
            <div 
              className={cn(
                'absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors duration-150',
                isFocused ? 'text-sage-700' : 'text-muted-foreground'
              )}
            >
              {rightIcon}
            </div>
          )}
        </div>
        
        {/* Helper/Error text */}
        <AnimatePresence mode="wait">
          {(error || helperText) && (
            <motion.p
              id={error ? `${inputId}-error` : `${inputId}-helper`}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'mt-2 text-sm',
                error ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              {error || helperText}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };

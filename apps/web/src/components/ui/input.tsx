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
          <motion.label
            htmlFor={inputId}
            className={cn(
              'block font-medium text-foreground mb-2 transition-colors duration-200',
              labelSizes[inputSize],
              disabled && 'text-muted-foreground',
              isFocused && 'text-sage-700'
            )}
            animate={{ 
              color: isFocused ? 'hsl(92 14% 32%)' : undefined 
            }}
          >
            {label}
          </motion.label>
        )}
        <motion.div 
          className="relative"
          animate={isFocused ? 'focused' : 'rest'}
        >
          {(leftIcon || isSearch) && (
            <motion.div 
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              animate={{ 
                color: isFocused ? 'hsl(92 14% 32%)' : 'hsl(92 12% 61%)',
                scale: isFocused ? 1.05 : 1,
              }}
              transition={{ duration: 0.2 }}
            >
              {isSearch ? <Search className="w-5 h-5" /> : leftIcon}
            </motion.div>
          )}
          <motion.div
            className="relative"
            whileTap={{ scale: 0.995 }}
          >
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
                'text-foreground placeholder:text-muted-foreground',
                'ring-offset-background transition-all duration-200',
                'focus-visible:outline-none',
                'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-accent',
                sizes[inputSize],
                (leftIcon || isSearch) && 'pl-11',
                (rightIcon || isPassword) && 'pr-11',
                error
                  ? 'border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20'
                  : 'border-sage-200 hover:border-sage-400 focus:border-sage-700 focus:ring-2 focus:ring-sage-700/15',
                className
              )}
              {...props}
            />
            {/* Focus glow effect */}
            <AnimatePresence>
              {isFocused && !error && (
                <motion.span
                  className="absolute inset-0 rounded-lg pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: 1,
                    boxShadow: '0 0 0 3px rgba(139, 154, 126, 0.12)',
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </AnimatePresence>
          </motion.div>
          {isPassword && (
            <motion.button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors touch-target flex items-center justify-center"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={showPassword ? 'hide' : 'show'}
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.15 }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          )}
          {rightIcon && !isPassword && (
            <motion.div 
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              animate={{ 
                color: isFocused ? 'hsl(92 14% 32%)' : 'hsl(92 12% 61%)',
              }}
              transition={{ duration: 0.2 }}
            >
              {rightIcon}
            </motion.div>
          )}
        </motion.div>
        <AnimatePresence mode="wait">
          {(error || helperText) && (
            <motion.p
              id={error ? `${inputId}-error` : `${inputId}-helper`}
              initial={{ opacity: 0, y: -5, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -5, height: 0 }}
              transition={{ duration: 0.2 }}
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

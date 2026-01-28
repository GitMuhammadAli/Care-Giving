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

/**
 * UNIQUE "Living Field" Input
 * - Organic border that "breathes" on focus
 * - Floating particle effect on active typing
 * - Warmth gradient that follows cursor
 * - Gentle pulse when validation changes
 */
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
      onChange,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);
    const [isTyping, setIsTyping] = React.useState(false);
    const [cursorX, setCursorX] = React.useState(50);
    const typingTimeoutRef = React.useRef<NodeJS.Timeout>();
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
      setIsTyping(false);
      onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsTyping(true);
      // Track cursor position for gradient effect
      const input = e.target;
      const inputRect = input.getBoundingClientRect();
      const selectionStart = input.selectionStart || 0;
      const charWidth = inputRect.width / Math.max(input.value.length, 1);
      const cursorPos = Math.min(selectionStart * charWidth, inputRect.width);
      setCursorX((cursorPos / inputRect.width) * 100);
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Set typing indicator to false after delay
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 800);
      
      onChange?.(e);
    };

    React.useEffect(() => {
      return () => {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      };
    }, []);

    return (
      <div className="w-full">
        {/* Animated label */}
        {label && (
          <motion.label
            htmlFor={inputId}
            className={cn(
              'block font-medium mb-2',
              labelSizes[inputSize],
              disabled ? 'text-muted-foreground' : 'text-foreground'
            )}
            animate={{
              color: isFocused ? 'hsl(var(--sage-700))' : 'hsl(var(--foreground))',
              x: isFocused ? 2 : 0,
            }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {label}
          </motion.label>
        )}
        
        <div className="relative">
          {/* Organic glow ring */}
          <motion.div
            className="absolute -inset-[2px] rounded-xl pointer-events-none"
            animate={{
              opacity: isFocused ? 1 : 0,
              scale: isFocused ? 1 : 0.98,
            }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              background: error
                ? 'linear-gradient(135deg, rgba(220,38,38,0.15), rgba(220,38,38,0.05))'
                : `linear-gradient(135deg, 
                    rgba(139,154,126,0.2) 0%, 
                    rgba(139,154,126,0.05) ${cursorX}%, 
                    rgba(139,154,126,0.2) 100%)`,
              filter: 'blur(2px)',
            }}
          />
          
          {/* Breathing border animation */}
          <motion.div
            className="absolute inset-0 rounded-lg pointer-events-none"
            animate={{
              boxShadow: isFocused
                ? [
                    '0 0 0 2px rgba(139,154,126,0.3)',
                    '0 0 0 3px rgba(139,154,126,0.2)',
                    '0 0 0 2px rgba(139,154,126,0.3)',
                  ]
                : '0 0 0 0px rgba(139,154,126,0)',
            }}
            transition={{
              duration: 2.5,
              repeat: isFocused ? Infinity : 0,
              ease: 'easeInOut',
            }}
          />

          {/* Left icon with subtle animation */}
          {(leftIcon || isSearch) && (
            <motion.div 
              className={cn(
                'absolute left-3.5 top-1/2 -translate-y-1/2',
                'text-muted-foreground'
              )}
              animate={{
                color: isFocused ? 'hsl(var(--sage-700))' : 'hsl(var(--muted-foreground))',
                scale: isFocused ? 1.05 : 1,
              }}
              transition={{ duration: 0.2 }}
            >
              {isSearch ? <Search className="w-5 h-5" /> : leftIcon}
            </motion.div>
          )}
          
          {/* Input field */}
          <motion.input
            ref={ref}
            id={inputId}
            type={isPassword && showPassword ? 'text' : type}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            className={cn(
              'flex w-full rounded-lg border bg-background relative z-10',
              'text-foreground placeholder:text-muted-foreground/60',
              'transition-colors duration-200 ease-out',
              'focus-visible:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-accent',
              sizes[inputSize],
              (leftIcon || isSearch) && 'pl-11',
              (rightIcon || isPassword) && 'pr-11',
              error
                ? 'border-destructive'
                : 'border-sage-200 hover:border-sage-400 focus:border-sage-700',
              className
            )}
            animate={{
              borderRadius: isFocused ? '12px' : '8px',
            }}
            transition={{ duration: 0.2 }}
            {...props}
          />
          
          {/* Typing indicator particles */}
          <AnimatePresence>
            {isTyping && isFocused && (
              <>
                {[...Array(3)].map((_, i) => (
                  <motion.span
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-sage-500/60 pointer-events-none"
                    style={{
                      left: `${cursorX}%`,
                      top: '50%',
                    }}
                    initial={{ opacity: 0, scale: 0, y: 0 }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0.5, 1, 0.5],
                      y: [-5 - i * 5, -20 - i * 8],
                      x: [(i - 1) * 3, (i - 1) * 8],
                    }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{
                      duration: 0.6,
                      delay: i * 0.1,
                      ease: 'easeOut',
                    }}
                  />
                ))}
              </>
            )}
          </AnimatePresence>
          
          {/* Password toggle */}
          {isPassword && (
            <motion.button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-150 touch-target flex items-center justify-center z-20"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={showPassword ? 'hide' : 'show'}
                  initial={{ opacity: 0, rotateY: -90 }}
                  animate={{ opacity: 1, rotateY: 0 }}
                  exit={{ opacity: 0, rotateY: 90 }}
                  transition={{ duration: 0.15 }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          )}
          
          {/* Right icon */}
          {rightIcon && !isPassword && (
            <motion.div 
              className={cn(
                'absolute right-3.5 top-1/2 -translate-y-1/2 z-20',
                'text-muted-foreground'
              )}
              animate={{
                color: isFocused ? 'hsl(var(--sage-700))' : 'hsl(var(--muted-foreground))',
              }}
              transition={{ duration: 0.2 }}
            >
              {rightIcon}
            </motion.div>
          )}
        </div>
        
        {/* Helper/Error text with unique animation */}
        <AnimatePresence mode="wait">
          {(error || helperText) && (
            <motion.p
              id={error ? `${inputId}-error` : `${inputId}-helper`}
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={cn(
                'mt-2 text-sm overflow-hidden',
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

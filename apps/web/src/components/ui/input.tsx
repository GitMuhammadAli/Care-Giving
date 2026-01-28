'use client';

import * as React from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
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

// Unique "Warmth Spread" border animation
function WarmthBorder({ isFocused }: { isFocused: boolean }) {
  return (
    <>
      {/* Animated border that "spreads" from center */}
      <svg 
        className="absolute inset-0 w-full h-full pointer-events-none" 
        style={{ overflow: 'visible' }}
      >
        <motion.rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          rx="8"
          ry="8"
          fill="none"
          stroke="url(#warmth-gradient)"
          strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={isFocused ? { 
            pathLength: 1, 
            opacity: 1,
          } : { 
            pathLength: 0, 
            opacity: 0,
          }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="warmth-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B9A7E" />
            <stop offset="50%" stopColor="#996B4D" />
            <stop offset="100%" stopColor="#8B9A7E" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Soft glow effect */}
      <motion.div
        className="absolute inset-0 rounded-lg pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isFocused ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{
          boxShadow: '0 0 15px rgba(139, 154, 126, 0.25), 0 0 30px rgba(139, 154, 126, 0.1)',
        }}
      />
    </>
  );
}

// Floating label animation
function FloatingLabel({ 
  label, 
  isFocused, 
  hasValue, 
  inputId,
  size,
}: { 
  label: string; 
  isFocused: boolean; 
  hasValue: boolean; 
  inputId: string;
  size: 'sm' | 'md' | 'lg';
}) {
  const isFloating = isFocused || hasValue;
  
  const sizeStyles = {
    sm: { normal: 'top-2.5 text-sm', floating: '-top-2.5 text-xs' },
    md: { normal: 'top-3.5 text-base', floating: '-top-2.5 text-xs' },
    lg: { normal: 'top-4 text-lg', floating: '-top-3 text-sm' },
  };

  return (
    <motion.label
      htmlFor={inputId}
      className={cn(
        'absolute left-3.5 px-1 bg-background pointer-events-none transition-colors duration-200',
        'font-medium z-10',
        isFocused ? 'text-sage-700' : 'text-muted-foreground'
      )}
      initial={false}
      animate={{
        y: isFloating ? -24 : 0,
        scale: isFloating ? 0.85 : 1,
        x: isFloating ? -4 : 0,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {label}
    </motion.label>
  );
}

// Typing cursor animation
function TypingIndicator({ isTyping }: { isTyping: boolean }) {
  return (
    <AnimatePresence>
      {isTyping && (
        <motion.span
          className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-0.5"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1 h-1 bg-sage-500 rounded-full"
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                delay: i * 0.1,
              }}
            />
          ))}
        </motion.span>
      )}
    </AnimatePresence>
  );
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
      onChange,
      value,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);
    const [isTyping, setIsTyping] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(!!value);
    const typingTimeoutRef = React.useRef<NodeJS.Timeout>();
    const inputId = id || `input-${React.useId()}`;
    const isPassword = type === 'password';
    const isSearch = type === 'search';

    const sizes = {
      sm: 'h-10 text-sm px-3',
      md: 'h-12 text-base px-3.5',
      lg: 'h-14 text-lg px-4',
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value);
      setIsTyping(true);
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set typing to false after delay
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 500);
      
      onChange?.(e);
    };

    React.useEffect(() => {
      return () => {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      };
    }, []);

    React.useEffect(() => {
      setHasValue(!!value);
    }, [value]);

    return (
      <div className="w-full">
        <motion.div 
          className="relative"
          animate={isFocused ? 'focused' : 'rest'}
        >
          {/* Warmth border effect */}
          <WarmthBorder isFocused={isFocused && !error} />
          
          {/* Floating label */}
          {label && (
            <FloatingLabel
              label={label}
              isFocused={isFocused}
              hasValue={hasValue}
              inputId={inputId}
              size={inputSize}
            />
          )}
          
          {/* Left icon */}
          {(leftIcon || isSearch) && (
            <motion.div 
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10"
              animate={{ 
                color: isFocused ? '#525E48' : '#9AAA8D',
                scale: isFocused ? 1.1 : 1,
                rotate: isFocused ? [0, -10, 10, 0] : 0,
              }}
              transition={{ duration: 0.3 }}
            >
              {isSearch ? <Search className="w-5 h-5" /> : leftIcon}
            </motion.div>
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
            onChange={handleChange}
            value={value}
            className={cn(
              'flex w-full rounded-lg border bg-background relative z-0',
              'text-foreground placeholder:text-muted-foreground/60',
              'ring-offset-background transition-all duration-200',
              'focus-visible:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-accent',
              'active:scale-[0.995] transform',
              sizes[inputSize],
              (leftIcon || isSearch) && 'pl-11',
              (rightIcon || isPassword) && 'pr-11',
              label && 'pt-5',
              error
                ? 'border-destructive'
                : 'border-sage-200 hover:border-sage-400',
              className
            )}
            {...props}
          />
          
          {/* Password toggle */}
          {isPassword && (
            <motion.button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors touch-target flex items-center justify-center z-10"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9, rotate: 180 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={showPassword ? 'hide' : 'show'}
                  initial={{ opacity: 0, y: 10, rotate: -90 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  exit={{ opacity: 0, y: -10, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          )}
          
          {/* Right icon */}
          {rightIcon && !isPassword && (
            <motion.div 
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10"
              animate={{ 
                color: isFocused ? '#525E48' : '#9AAA8D',
              }}
              transition={{ duration: 0.2 }}
            >
              {rightIcon}
            </motion.div>
          )}
          
          {/* Typing indicator (for search) */}
          {isSearch && <TypingIndicator isTyping={isTyping} />}
        </motion.div>
        
        {/* Helper/Error text */}
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

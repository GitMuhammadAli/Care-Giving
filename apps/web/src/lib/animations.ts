import { Variants } from 'framer-motion';

// Stagger container for children animations
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

// Fade up animation for individual items
export const fadeUp: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20,
  },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

// Fade in animation (no movement)
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { 
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

// Scale up animation
export const scaleUp: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
  },
  show: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

// Slide in from left
export const slideInLeft: Variants = {
  hidden: { 
    opacity: 0, 
    x: -30,
  },
  show: { 
    opacity: 1, 
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

// Slide in from right
export const slideInRight: Variants = {
  hidden: { 
    opacity: 0, 
    x: 30,
  },
  show: { 
    opacity: 1, 
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

// Page transition
export const pageTransition: Variants = {
  initial: { 
    opacity: 0, 
    y: 20,
  },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: {
      duration: 0.2,
    },
  },
};

// Card hover animation
export const cardHover = {
  rest: { 
    scale: 1,
    boxShadow: '0 1px 3px rgba(82, 94, 72, 0.04), 0 4px 12px rgba(82, 94, 72, 0.03)',
  },
  hover: { 
    scale: 1.02,
    boxShadow: '0 4px 12px rgba(82, 94, 72, 0.08), 0 12px 32px rgba(82, 94, 72, 0.06)',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
  tap: { 
    scale: 0.98,
  },
};

// Button hover animation
export const buttonHover = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.02,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
  tap: { 
    scale: 0.98,
  },
};

// Icon bounce animation
export const iconBounce = {
  rest: { y: 0 },
  hover: { 
    y: -2,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 10,
    },
  },
};

// Floating animation (continuous)
export const floating = {
  animate: {
    y: [0, -8, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Pulse glow animation
export const pulseGlow = {
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(139, 154, 126, 0)',
      '0 0 0 8px rgba(139, 154, 126, 0.15)',
      '0 0 0 0 rgba(139, 154, 126, 0)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// List item stagger (for lists)
export const listItem: Variants = {
  hidden: { opacity: 0, x: -10 },
  show: { 
    opacity: 1, 
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

// Checkbox animation
export const checkboxVariants = {
  unchecked: { scale: 1 },
  checked: { 
    scale: [1, 1.2, 1],
    transition: {
      duration: 0.3,
    },
  },
};

// Input focus animation
export const inputFocus = {
  rest: { 
    borderColor: 'hsl(92 13% 81%)',
    boxShadow: '0 0 0 0 rgba(139, 154, 126, 0)',
  },
  focus: { 
    borderColor: 'hsl(92 14% 32%)',
    boxShadow: '0 0 0 3px rgba(139, 154, 126, 0.15)',
    transition: {
      duration: 0.2,
    },
  },
};

// Notification pop animation
export const notificationPop: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.8, 
    y: -20,
  },
  show: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 20,
    },
  },
  exit: { 
    opacity: 0, 
    scale: 0.8, 
    y: -20,
    transition: {
      duration: 0.2,
    },
  },
};

// Shimmer effect for loading states
export const shimmer = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};


import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: {
        '2xl': '1280px',
      },
    },
    extend: {
      fontFamily: {
        editorial: ['var(--font-libre-baskerville)', 'Georgia', 'serif'],
        body: ['var(--font-source-sans-3)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-source-sans-3)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-libre-baskerville)', 'Georgia', 'serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Caregiving design tokens
        ink: 'hsl(var(--ink))',
        cream: 'hsl(var(--cream))',
        sage: 'hsl(var(--sage))',
        terracotta: 'hsl(var(--terracotta))',
        slate: 'hsl(var(--slate))',
        'warm-gray': 'hsl(var(--warm-gray))',
        stone: 'hsl(var(--stone))',
        // Semantic caregiving colors
        'care-calm': 'hsl(var(--care-calm))',
        'care-warmth': 'hsl(var(--care-warmth))',
        'care-trust': 'hsl(var(--care-trust))',
        'care-light': 'hsl(var(--care-light))',
        'care-text': 'hsl(var(--care-text))',
        // Legacy tokens for backward compatibility
        bg: {
          base: 'var(--bg-base)',
          surface: 'var(--bg-surface)',
          muted: 'var(--bg-muted)',
          subtle: 'var(--bg-subtle)',
          inverse: 'var(--bg-inverse)',
        },
        'border-subtle': 'var(--border-subtle)',
        'border-default': 'var(--border-default)',
        'border-strong': 'var(--border-strong)',
        'border-focus': 'var(--border-focus)',
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          disabled: 'var(--text-disabled)',
          inverse: 'var(--text-inverse)',
          link: 'var(--text-link)',
        },
        'accent-primary': 'var(--accent-primary)',
        'accent-primary-hover': 'var(--accent-primary-hover)',
        'accent-primary-light': 'var(--accent-primary-light)',
        'accent-warm': 'var(--accent-warm)',
        'accent-warm-hover': 'var(--accent-warm-hover)',
        'accent-warm-light': 'var(--accent-warm-light)',
        success: {
          DEFAULT: 'var(--success)',
          light: 'var(--success-light)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          light: 'var(--warning-light)',
        },
        error: {
          DEFAULT: 'var(--error)',
          light: 'var(--error-light)',
        },
        info: {
          DEFAULT: 'var(--info)',
          light: 'var(--info-light)',
        },
        emergency: {
          DEFAULT: 'var(--emergency)',
          light: 'var(--emergency-light)',
          dark: 'var(--emergency-dark)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: '0.5rem',
        '2xl': '0.75rem',
      },
      letterSpacing: {
        editorial: '-0.01em',
        caps: '0.12em',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(26, 26, 24, 0.04)',
        sm: '0 2px 4px rgba(26, 26, 24, 0.06)',
        md: '0 4px 12px rgba(26, 26, 24, 0.08)',
        lg: '0 8px 24px rgba(26, 26, 24, 0.12)',
        xl: '0 16px 48px rgba(26, 26, 24, 0.16)',
        inner: 'inset 0 1px 2px rgba(26, 26, 24, 0.06)',
        focus: '0 0 0 3px rgba(168, 181, 160, 0.3)',
        'warm-glow': '0 8px 32px rgba(196, 164, 132, 0.2)',
        'sage-glow': '0 8px 32px rgba(168, 181, 160, 0.2)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        pulseGentle: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        pulseEmergency: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(211, 47, 47, 0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(211, 47, 47, 0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-10px)' },
          '50%': { transform: 'translateX(10px)' },
          '75%': { transform: 'translateX(-5px)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.6s ease-out forwards',
        'fade-in-up': 'fadeInUp 400ms ease-out',
        'slide-up': 'slideUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-down': 'slideDown 200ms ease-out',
        'slide-in-right': 'slideInRight 300ms ease-out',
        'pulse-gentle': 'pulseGentle 2s ease-in-out infinite',
        'pulse-emergency': 'pulseEmergency 1.5s ease-in-out infinite',
        shake: 'shake 400ms ease-in-out',
        'scale-in': 'scaleIn 200ms ease-out',
        float: 'float 6s ease-in-out infinite',
      },
      spacing: {
        '18': '72px',
        '88': '352px',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      backgroundImage: {
        'warm-gradient': 'linear-gradient(135deg, hsl(var(--cream)) 0%, hsl(var(--stone)) 100%)',
        'sage-gradient': 'linear-gradient(135deg, hsl(var(--sage) / 0.2) 0%, hsl(var(--sage) / 0.1) 100%)',
        'hero-pattern': `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23A8B5A0' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;

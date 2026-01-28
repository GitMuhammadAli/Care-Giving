'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { PublicRoute } from '@/components/auth/public-route';
import { AnimatedBackground } from '@/components/ui/animated-background';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublicRoute>
      <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
        {/* Animated Background */}
        <AnimatedBackground />

        {/* Header */}
        <motion.header 
          className="p-4 sm:p-6 relative z-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <Link href="/" className="inline-flex items-center gap-2 group">
            <motion.div 
              className="w-9 h-9 rounded-lg bg-sage flex items-center justify-center"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <Heart className="w-5 h-5 text-cream" fill="currentColor" />
            </motion.div>
            <motion.span 
              className="font-serif text-xl text-foreground"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              CareCircle
            </motion.span>
          </Link>
        </motion.header>

        {/* Content */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10">
          {children}
        </main>

        {/* Footer */}
        <motion.footer 
          className="p-4 sm:p-6 text-center relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} CareCircle. Made with{' '}
            <motion.span 
              className="inline-block"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
            >
              ❤️
            </motion.span>
            {' '}for families.
          </p>
        </motion.footer>
      </div>
    </PublicRoute>
  );
}

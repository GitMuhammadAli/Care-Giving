'use client';

import Link from 'next/link';
import HeartIcon from '@/components/icons/heart-icon';
import { PublicRoute } from '@/components/auth/public-route';
import { AnimatedBackground } from '@/components/ui/animated-background';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublicRoute>
      <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
        {/* Animated Background */}
        <AnimatedBackground />

        {/* Header */}
        <header className="p-4 sm:p-6 relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-sage flex items-center justify-center transition-transform duration-150 group-hover:scale-105">
              <HeartIcon size={20} className="text-cream" />
            </div>
            <span className="font-serif text-xl text-foreground">CareCircle</span>
          </Link>
        </header>

        {/* Content */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10">
          {children}
        </main>

        {/* Footer */}
        <footer className="p-4 sm:p-6 text-center relative z-10">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} CareCircle. Made with ❤️ for families.
          </p>
        </footer>
      </div>
    </PublicRoute>
  );
}

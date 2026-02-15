'use client';

import Link from 'next/link';
import HeartIcon from '@/components/icons/heart-icon';
import { PublicRoute } from '@/components/auth/public-route';

/**
 * Auth Flexible Layout - For routes that should work regardless of auth state
 *
 * This layout is similar to the (auth) layout but:
 * - Allows authenticated users to access these pages
 * - Used for routes like password reset that must work even when logged in
 * - User might be resetting password while already logged in
 */
export default function AuthFlexibleLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublicRoute allowAuthenticated>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="p-4 sm:p-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-sage flex items-center justify-center">
              <HeartIcon size={20} className="text-foreground" />
            </div>
            <span className="font-serif text-xl text-foreground">CareCircle</span>
          </Link>
        </header>

        {/* Content */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">{children}</main>

        {/* Footer */}
        <footer className="p-4 sm:p-6 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} CareCircle. Made with care for families.
          </p>
        </footer>
      </div>
    </PublicRoute>
  );
}

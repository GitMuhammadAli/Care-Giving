'use client';

import * as React from 'react';
import { memo, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BetaBadge } from '@/components/ui/coming-soon-badge';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/components/providers/auth-provider';

// Static data moved outside component to prevent recreation
const navLinks = [
  { label: 'About', href: '/about' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Stories', href: '/stories' },
  { label: 'Journal', href: '/journal' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Contact', href: '/contact' },
] as const;

// Memoized nav link component to prevent re-renders
const NavLink = memo(function NavLink({ 
  href, 
  label, 
  isActive,
  onClick,
}: { 
  href: string; 
  label: string; 
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'label-caps transition-colors',
        isActive
          ? 'text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
    </Link>
  );
});

// Memoized mobile nav link
const MobileNavLink = memo(function MobileNavLink({ 
  href, 
  label, 
  isActive,
  onClick,
}: { 
  href: string; 
  label: string; 
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'label-caps py-2',
        isActive ? 'text-foreground' : 'text-muted-foreground'
      )}
    >
      {label}
    </Link>
  );
});

export const Header = memo(function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, isInitialized, user } = useAuthContext();

  // Memoize handlers
  const toggleMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  // Memoize auth state check
  const isLoggedIn = useMemo(() => 
    isInitialized && isAuthenticated && user,
    [isInitialized, isAuthenticated, user]
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
      <div className="container mx-auto">
        <div className="flex items-center justify-between h-16 px-6">
          <Link href="/" className="flex items-center gap-2 font-serif text-xl tracking-tight text-foreground">
            CareCircle
            <BetaBadge size="sm" showIcon={false} />
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                isActive={pathname === link.href}
              />
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {/* Show different buttons based on auth state */}
            {isLoggedIn ? (
              // Authenticated user - show dashboard link
              <Link href="/dashboard">
                <Button variant="editorial" size="sm" className="hidden sm:inline-flex gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Button>
              </Link>
            ) : (
              // Not authenticated - show sign in and get started
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="hidden sm:inline-flex label-caps">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="editorial" size="sm" className="hidden sm:inline-flex">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
            <button
              className="md:hidden p-2"
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4 px-6">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <MobileNavLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  isActive={pathname === link.href}
                  onClick={closeMenu}
                />
              ))}
              <div className="flex gap-3 pt-4 border-t border-border mt-2">
                {isLoggedIn ? (
                  // Authenticated user - show dashboard link
                  <Link href="/dashboard" className="flex-1" onClick={closeMenu}>
                    <Button variant="editorial" size="sm" className="w-full gap-2">
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  // Not authenticated - show sign in and get started
                  <>
                    <Link href="/login" className="flex-1" onClick={closeMenu}>
                      <Button variant="ghost" size="sm" className="label-caps w-full">
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/register" className="flex-1" onClick={closeMenu}>
                      <Button variant="editorial" size="sm" className="w-full">
                        Get Started
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
});

export default Header;

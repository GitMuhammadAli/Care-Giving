'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Bell,
  Settings,
  User,
  LogOut,
  ChevronDown,
  Home,
  Calendar,
  Heart,
  FileText,
  Pill,
  Activity,
  MessageCircle,
  Users,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

interface DashboardHeaderProps {
  className?: string;
  currentUser?: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
  careRecipient?: {
    id: string;
    name: string;
    preferredName?: string;
    photoUrl?: string;
  };
}

export function DashboardHeader({ className, currentUser, careRecipient }: DashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    // Use hard redirect to ensure clean state (no stale auth data)
    window.location.href = '/login';
  };

  // Get user initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const mainNavLinks = [
    { label: 'Home', href: '/dashboard', icon: Home },
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    { label: 'Medications', href: '/medications', icon: Pill },
    { label: 'Documents', href: '/documents', icon: FileText },
    { label: 'Timeline', href: '/timeline', icon: Activity },
    { label: 'Chat', href: '/chat', icon: MessageCircle },
    { label: 'Caregivers', href: '/caregivers', icon: Users },
  ];

  const secondaryNavLinks = [
    { label: 'Family Settings', href: '/family', icon: Users },
    { label: 'Account', href: '/settings', icon: Settings },
  ];

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 bg-background backdrop-blur-sm border-b border-border shadow-sm",
      className
    )}>
      <div className="container max-w-7xl mx-auto">
        <div className="flex items-center justify-between h-16 px-4 md:px-6 gap-2 md:gap-4">
          {/* Logo */}
          <Link href="/dashboard" className="font-serif text-xl font-bold tracking-tight text-primary hover:opacity-80 transition-opacity shrink-0">
            CareCircle
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center overflow-hidden">
            {mainNavLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-1.5 px-2 xl:px-3 py-2 rounded-lg text-xs xl:text-sm font-semibold transition-all whitespace-nowrap",
                    isActive
                      ? "text-primary-foreground bg-primary shadow-sm"
                      : "text-foreground hover:text-primary hover:bg-accent"
                  )}
                >
                  <link.icon className="w-4 h-4 shrink-0" />
                  <span className="hidden xl:inline">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            {/* Notifications */}
            <div className="relative hidden md:block">
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-xl h-9 w-9"
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setUserMenuOpen(false);
                }}
              >
                <Bell className="w-4 h-4" />
                {/* Notification badge - uncomment when needed */}
                {/* <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-[10px] flex items-center justify-center text-destructive-foreground font-semibold">
                  3
                </span> */}
              </Button>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-xl shadow-lg z-50 p-4 animate-fade">
                  <h3 className="font-serif text-lg text-primary mb-3 font-bold">Notifications</h3>
                  <p className="text-sm text-muted-foreground text-center py-4">No new notifications</p>
                </div>
              )}
            </div>

            {/* Settings */}
            <Link href="/settings" className="hidden md:block">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl h-9 w-9"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </Link>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => {
                  setUserMenuOpen(!userMenuOpen);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-accent transition-colors"
              >
                {/* Avatar */}
                {user?.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={user.fullName || 'User'}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-lg object-cover border-2 border-primary"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                    <span className="text-xs font-bold text-primary-foreground">
                      {user?.fullName ? getInitials(user.fullName) : <User className="w-4 h-4" />}
                    </span>
                  </div>
                )}
                <ChevronDown className="w-3 h-3 hidden md:block" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-12 w-64 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade">
                  {/* User Info */}
                  <div className="p-4 border-b border-border bg-accent">
                    <p className="font-bold text-foreground truncate">{user?.fullName || 'User'}</p>
                    <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                  </div>

                  {/* Menu Items */}
                  <div className="p-2">
                    <Link
                      href="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent hover:text-primary transition-colors font-semibold"
                    >
                      <Settings className="w-4 h-4" />
                      Account Settings
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent hover:text-primary transition-colors font-semibold"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors w-full font-semibold"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Care Recipient Selector (Desktop) */}
            {careRecipient && (
              <div className="hidden 2xl:flex">
                <button
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded-lg border border-border',
                    'bg-card hover:bg-accent',
                    'transition-all duration-150 shadow-sm hover:shadow'
                  )}
                >
                  <Avatar
                    name={careRecipient.preferredName || careRecipient.name}
                    src={careRecipient.photoUrl}
                    size="sm"
                  />
                  <span className="text-xs font-semibold text-primary max-w-[80px] truncate">
                    {careRecipient.preferredName || careRecipient.name.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3 h-3 shrink-0" />
                </button>
              </div>
            )}

            {/* Emergency Button (Desktop) */}
            <Button
              variant="emergency"
              size="sm"
              leftIcon={<AlertTriangle className="w-4 h-4" />}
              className="hidden xl:flex"
            >
              Emergency
            </Button>

            {/* Mobile Menu Toggle */}
            <button
              className="lg:hidden p-2 rounded-xl hover:bg-accent/50"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border py-4 px-4 bg-background/95 backdrop-blur-sm max-h-[80vh] overflow-y-auto">
            {/* Care Recipient (Mobile) */}
            {careRecipient && (
              <div className="mb-4 pb-4 border-b border-border">
                <button
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg',
                    'bg-primary/10 hover:bg-primary/20',
                    'transition-colors duration-150'
                  )}
                >
                  <Avatar
                    name={careRecipient.preferredName || careRecipient.name}
                    src={careRecipient.photoUrl}
                    size="md"
                  />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground truncate">
                      {careRecipient.preferredName || careRecipient.name}
                    </p>
                    <p className="text-xs text-muted-foreground">Care Recipient</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            )}

            {/* Main Navigation */}
            <nav className="flex flex-col gap-1 mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                Main Menu
              </p>
              {mainNavLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors",
                      isActive
                        ? "bg-primary/15 text-foreground font-medium"
                        : "text-foreground hover:bg-accent/50"
                    )}
                  >
                    <link.icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Secondary Navigation */}
            <nav className="flex flex-col gap-1 mb-4 pt-4 border-t border-border">
              {secondaryNavLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors",
                      isActive
                        ? "bg-primary/15 text-foreground font-medium"
                        : "text-foreground hover:bg-accent/50"
                    )}
                  >
                    <link.icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Emergency Button (Mobile) */}
            <div className="pt-4 border-t border-border mb-4">
              <Button
                variant="emergency"
                fullWidth
                size="lg"
                leftIcon={<AlertTriangle className="w-5 h-5" />}
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push('/emergency');
                }}
              >
                Emergency
              </Button>
            </div>

            {/* User Section (Mobile) */}
            <div className="pt-4 border-t border-border">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-colors w-full"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close menus */}
      {(userMenuOpen || notificationsOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setUserMenuOpen(false);
            setNotificationsOpen(false);
          }}
        />
      )}
    </header>
  );
}


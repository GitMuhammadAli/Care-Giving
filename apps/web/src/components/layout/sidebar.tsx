'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Calendar, Pill, Activity } from 'lucide-react';
import HomeIcon from '@/components/icons/home-icon';
import HeartIcon from '@/components/icons/heart-icon';
import FileDescriptionIcon from '@/components/icons/file-description-icon';
import UsersIcon from '@/components/icons/users-icon';
import GearIcon from '@/components/icons/gear-icon';
import TriangleAlertIcon from '@/components/icons/triangle-alert-icon';
import DownChevron from '@/components/icons/down-chevron';
import LogoutIcon from '@/components/icons/logout-icon';
import MessageCircleIcon from '@/components/icons/message-circle-icon';

const mainNavItems: { href: string; icon: any; label: string }[] = [
  { href: '/dashboard', icon: HomeIcon, label: 'Home' },
  { href: '/care-recipients', icon: HeartIcon, label: 'Loved Ones' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/medications', icon: Pill, label: 'Medications' },
  { href: '/documents', icon: FileDescriptionIcon, label: 'Documents' },
  { href: '/timeline', icon: Activity, label: 'Activity' },
  { href: '/chat', icon: MessageCircleIcon, label: 'Family Chat' },
  { href: '/caregivers', icon: UsersIcon, label: 'Caregivers' },
];

const secondaryNavItems: { href: string; icon: any; label: string }[] = [
  { href: '/family', icon: UsersIcon, label: 'Family Settings' },
  { href: '/settings', icon: GearIcon, label: 'Account' },
];

interface SidebarProps {
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

export function Sidebar({ currentUser, careRecipient }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'hidden sm:flex flex-col',
        'w-[260px] h-screen',
        'bg-card border-r border-border',
        'fixed left-0 top-0'
      )}
    >
      {/* Logo */}
      <div className="h-[72px] flex items-center px-5 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-sage flex items-center justify-center">
            <HeartIcon size={20} className="text-foreground" />
          </div>
          <span className="font-editorial text-xl text-foreground">CareCircle</span>
        </Link>
      </div>

      {/* Care Recipient Selector */}
      {careRecipient && (
        <div className="p-4 border-b border-border">
          <button
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg',
              'bg-sage/10 hover:bg-sage/20',
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
            <DownChevron size={16} className="text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 h-11 rounded-lg',
                    'transition-all duration-150',
                    isActive
                      ? 'bg-sage/15 text-foreground font-medium border-l-[3px] border-sage ml-[-3px]'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="h-px bg-border my-4" />

        <ul className="space-y-1">
          {secondaryNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 h-11 rounded-lg',
                    'transition-all duration-150',
                    isActive
                      ? 'bg-sage/15 text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Emergency Button */}
      <div className="p-4 border-t border-border">
        <Button
          variant="emergency"
          fullWidth
          size="lg"
          leftIcon={<TriangleAlertIcon size={20} />}
        >
          Emergency
        </Button>
      </div>

      {/* User Profile */}
      {currentUser && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <Avatar name={currentUser.name} src={currentUser.avatarUrl} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{currentUser.name}</p>
              <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
            </div>
            <button
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Log out"
            >
              <LogoutIcon size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Calendar, Pill } from 'lucide-react';
import HomeIcon from '@/components/icons/home-icon';
import HeartIcon from '@/components/icons/heart-icon';
import MessageCircleIcon from '@/components/icons/message-circle-icon';

const navItems: { href: string; icon: any; label: string }[] = [
  { href: '/dashboard', icon: HomeIcon, label: 'Home' },
  { href: '/care-recipients', icon: HeartIcon, label: 'Loved Ones' },
  { href: '/medications', icon: Pill, label: 'Meds' },
  { href: '/chat', icon: MessageCircleIcon, label: 'Chat' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'bg-card/95 backdrop-blur-sm border-t border-border',
        'pb-safe sm:hidden'
      )}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center',
                'w-16 h-full touch-target',
                'transition-colors duration-150',
                isActive ? 'text-sage' : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                {isActive && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sage" />
                )}
                <Icon className="w-6 h-6" strokeWidth={isActive ? 2 : 1.5} />
              </div>
              <span className={cn('text-[11px] mt-1', isActive && 'font-medium')}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

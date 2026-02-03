'use client';

import { useAuthContext } from '@/components/providers/auth-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Menu, Bell, Search } from 'lucide-react';
import { useState } from 'react';

interface AdminHeaderProps {
  title?: string;
  onMenuClick?: () => void;
}

export function AdminHeader({ title = 'Admin Dashboard', onMenuClick }: AdminHeaderProps) {
  const { user } = useAuthContext();
  const [searchQuery, setSearchQuery] = useState('');

  const initials = user?.fullName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'AD';

  const roleLabel = user?.systemRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-sage-200 bg-card/95 backdrop-blur px-4 sm:px-6">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sage-100 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Title */}
      <h1 className="font-editorial text-xl text-foreground hidden sm:block">{title}</h1>

      {/* Search */}
      <div className="flex-1 max-w-md mx-auto hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users, families..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-sage-50 border border-sage-200 rounded-xl text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4 ml-auto">
        {/* Notifications */}
        <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sage-100 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </button>

        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-foreground">{user?.fullName}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sage/10 text-sage">
              {roleLabel}
            </span>
          </div>
          <Avatar className="h-9 w-9 border-2 border-sage">
            <AvatarImage src={user?.avatarUrl} alt={user?.fullName} />
            <AvatarFallback className="bg-sage-100 text-sage-700 text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}

export default AdminHeader;

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
  const roleBadgeVariant = user?.systemRole === 'SUPER_ADMIN' ? 'default' : 'secondary';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur px-4 sm:px-6">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Title */}
      <h1 className="text-lg font-semibold text-white hidden sm:block">{title}</h1>

      {/* Search */}
      <div className="flex-1 max-w-md mx-auto hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search users, families..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4 ml-auto">
        {/* Notifications */}
        <button className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-white">{user?.fullName}</p>
            <Badge variant={roleBadgeVariant} className="text-xs">
              {roleLabel}
            </Badge>
          </div>
          <Avatar className="h-9 w-9 border-2 border-emerald-600">
            <AvatarImage src={user?.avatarUrl} alt={user?.fullName} />
            <AvatarFallback className="bg-slate-700 text-white text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}

export default AdminHeader;


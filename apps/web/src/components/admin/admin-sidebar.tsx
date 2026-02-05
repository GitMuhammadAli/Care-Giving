'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Home,
  BarChart3,
  Shield,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  Heart,
  Activity,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface AdminSidebarProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

const navigation = [
  { name: 'Overview', href: '/admin/overview', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Families', href: '/admin/families', icon: Home },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Audit Logs', href: '/admin/audit', icon: Shield },
  { name: 'System Logs', href: '/admin/logs', icon: FileText },
  { name: 'Monitoring', href: '/admin/monitoring', icon: Activity },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export function AdminSidebar({ collapsed = false, onCollapse }: AdminSidebarProps) {
  const pathname = usePathname();
  const logout = useAuth((state) => state.logout);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-card border-r border-sage-200 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sage-200">
        {!collapsed && (
          <Link href="/admin/overview" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sage flex items-center justify-center shadow-sm">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-editorial text-lg text-foreground leading-tight">CareCircle</span>
              <span className="text-xs text-muted-foreground font-medium tracking-wide uppercase">Admin</span>
            </div>
          </Link>
        )}
        {collapsed && (
          <div className="w-9 h-9 mx-auto rounded-xl bg-sage flex items-center justify-center shadow-sm">
            <Heart className="w-5 h-5 text-white" />
          </div>
        )}
        {onCollapse && !collapsed && (
          <button
            onClick={() => onCollapse(true)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sage-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-sage text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-sage-100',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-white')} />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-sage-200 bg-sage-50/50">
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

export default AdminSidebar;

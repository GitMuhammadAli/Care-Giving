'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAdminUser, useUserActivity, useSuspendUser, useActivateUser, useResetUserPassword } from '@/hooks/admin';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  Shield, 
  Ban, 
  CheckCircle, 
  Key,
  Home,
  Activity
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ROLE_LABELS } from '@/lib/constants';

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-sage/10 text-sage border-sage/20',
  PENDING: 'bg-warning/10 text-warning border-warning/20',
  SUSPENDED: 'bg-destructive/10 text-destructive border-destructive/20',
  DELETED: 'bg-muted text-muted-foreground border-muted',
};

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-terracotta/10 text-terracotta border-terracotta/20',
  ADMIN: 'bg-sage/10 text-sage border-sage/20',
  MODERATOR: 'bg-slate/10 text-slate border-slate/20',
  USER: 'bg-muted text-muted-foreground border-muted',
};

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const { data: user, isLoading } = useAdminUser(userId);
  const { data: activity } = useUserActivity(userId);
  const suspendUser = useSuspendUser();
  const activateUser = useActivateUser();
  const resetPassword = useResetUserPassword();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">User not found</p>
        <Link href="/admin/users" className="text-sage hover:underline mt-2 inline-block">
          Back to Users
        </Link>
      </div>
    );
  }

  const initials = user.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase() || 'U';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-sage-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-editorial text-2xl text-foreground">User Details</h1>
        </div>
        <div className="flex items-center gap-2">
          {user.status === 'ACTIVE' && user.systemRole !== 'SUPER_ADMIN' && (
            <button
              onClick={() => suspendUser.mutate({ id: user.id })}
              className="flex items-center gap-2 px-4 py-2 bg-warning text-white rounded-xl hover:bg-warning/90 transition-colors"
            >
              <Ban className="w-4 h-4" />
              Suspend
            </button>
          )}
          {user.status === 'SUSPENDED' && (
            <button
              onClick={() => activateUser.mutate(user.id)}
              className="flex items-center gap-2 px-4 py-2 bg-sage text-white rounded-xl hover:bg-sage/90 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Activate
            </button>
          )}
          <button
            onClick={() => resetPassword.mutate(user.id)}
            className="flex items-center gap-2 px-4 py-2 border border-sage-200 text-foreground rounded-xl hover:bg-sage-100 transition-colors"
          >
            <Key className="w-4 h-4" />
            Reset Password
          </button>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="dashboard-card">
        <div className="flex items-start gap-6">
          <Avatar className="h-20 w-20 border-2 border-sage-200">
            <AvatarImage src={user.avatarUrl} />
            <AvatarFallback className="bg-sage-100 text-sage-700 text-xl font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-editorial text-foreground">{user.fullName}</h2>
              <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', statusColors[user.status] || statusColors.PENDING)}>
                {user.status}
              </span>
              <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', roleColors[user.systemRole] || roleColors.USER)}>
                {user.systemRole.replace('_', ' ')}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">{user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm">
                  Last login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="dashboard-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Home className="w-4 h-4" />
            <span className="text-sm">Families</span>
          </div>
          <p className="text-2xl font-editorial text-foreground">
            {user.familyMemberships?.length || 0}
          </p>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Activity className="w-4 h-4" />
            <span className="text-sm">Active Sessions</span>
          </div>
          <p className="text-2xl font-editorial text-foreground">
            {user._count?.sessions || 0}
          </p>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Mail className="w-4 h-4" />
            <span className="text-sm">Unread Notifications</span>
          </div>
          <p className="text-2xl font-editorial text-foreground">
            {user._count?.notifications || 0}
          </p>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Shield className="w-4 h-4" />
            <span className="text-sm">Email Verified</span>
          </div>
          <p className={cn('text-2xl font-editorial', user.emailVerified ? 'text-sage' : 'text-destructive')}>
            {user.emailVerified ? 'Yes' : 'No'}
          </p>
        </div>
      </div>

      {/* Family Memberships */}
      {user.familyMemberships && user.familyMemberships.length > 0 && (
        <div className="dashboard-card">
          <h3 className="font-medium text-foreground mb-4">Family Memberships</h3>
          <div className="space-y-3">
            {user.familyMemberships.map((membership) => (
              <div
                key={membership.id}
                className="flex items-center justify-between p-4 bg-sage-50 rounded-xl"
              >
                <div>
                  <Link
                    href={`/admin/families/${membership.family.id}`}
                    className="font-medium text-foreground hover:text-sage transition-colors"
                  >
                    {membership.family.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    Joined {new Date(membership.joinedAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', roleColors[membership.role] || roleColors.USER)}>
                  {ROLE_LABELS[membership.role] || membership.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {activity?.auditLogs && activity.auditLogs.length > 0 && (
        <div className="dashboard-card">
          <h3 className="font-medium text-foreground mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {activity.auditLogs.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-2 border-b border-sage-100 last:border-0"
              >
                <div>
                  <p className="text-sm text-foreground">{log.action}</p>
                  {log.resource && (
                    <p className="text-xs text-muted-foreground">
                      {log.resource} {log.resourceId && `(${log.resourceId.slice(0, 8)}...)`}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

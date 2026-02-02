'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAdminUser, useUserActivity, useSuspendUser, useActivateUser, useResetUserPassword } from '@/hooks/admin';
import { Badge } from '@/components/ui/badge';
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

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  PENDING: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  SUSPENDED: 'bg-red-500/20 text-red-400 border-red-500/30',
  DELETED: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  ADMIN: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  MODERATOR: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  USER: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">User not found</p>
        <Link href="/admin/users" className="text-emerald-400 hover:underline mt-2 inline-block">
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
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">User Details</h1>
        </div>
        <div className="flex items-center gap-2">
          {user.status === 'ACTIVE' && user.systemRole !== 'SUPER_ADMIN' && (
            <button
              onClick={() => suspendUser.mutate({ id: user.id })}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              <Ban className="w-4 h-4" />
              Suspend
            </button>
          )}
          {user.status === 'SUSPENDED' && (
            <button
              onClick={() => activateUser.mutate(user.id)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Activate
            </button>
          )}
          <button
            onClick={() => resetPassword.mutate(user.id)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Key className="w-4 h-4" />
            Reset Password
          </button>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="flex items-start gap-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user.avatarUrl} />
            <AvatarFallback className="bg-slate-700 text-white text-xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold text-white">{user.fullName}</h2>
              <Badge className={statusColors[user.status] || statusColors.PENDING}>
                {user.status}
              </Badge>
              <Badge className={roleColors[user.systemRole] || roleColors.USER}>
                {user.systemRole.replace('_', ' ')}
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="flex items-center gap-2 text-slate-300">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-sm">{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-sm">{user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-sm">
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="w-4 h-4 text-slate-400" />
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
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Home className="w-4 h-4" />
            <span className="text-sm">Families</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {user.familyMemberships?.length || 0}
          </p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Activity className="w-4 h-4" />
            <span className="text-sm">Active Sessions</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {user._count?.sessions || 0}
          </p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Mail className="w-4 h-4" />
            <span className="text-sm">Unread Notifications</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {user._count?.notifications || 0}
          </p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Shield className="w-4 h-4" />
            <span className="text-sm">Email Verified</span>
          </div>
          <p className={`text-2xl font-bold ${user.emailVerified ? 'text-emerald-400' : 'text-red-400'}`}>
            {user.emailVerified ? 'Yes' : 'No'}
          </p>
        </div>
      </div>

      {/* Family Memberships */}
      {user.familyMemberships && user.familyMemberships.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Family Memberships</h3>
          <div className="space-y-3">
            {user.familyMemberships.map((membership) => (
              <div
                key={membership.id}
                className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg"
              >
                <div>
                  <Link
                    href={`/admin/families/${membership.family.id}`}
                    className="font-medium text-white hover:text-emerald-400 transition-colors"
                  >
                    {membership.family.name}
                  </Link>
                  <p className="text-sm text-slate-400">
                    Joined {new Date(membership.joinedAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge className={roleColors[membership.role] || roleColors.USER}>
                  {membership.role}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {activity?.auditLogs && activity.auditLogs.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {activity.auditLogs.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0"
              >
                <div>
                  <p className="text-sm text-slate-300">{log.action}</p>
                  {log.resource && (
                    <p className="text-xs text-slate-400">
                      {log.resource} {log.resourceId && `(${log.resourceId.slice(0, 8)}...)`}
                    </p>
                  )}
                </div>
                <span className="text-xs text-slate-500">
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


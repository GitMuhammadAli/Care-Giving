'use client';

import { useState } from 'react';
import { useAdminUsers, useSuspendUser, useActivateUser, useDeleteAdminUser } from '@/hooks/admin';
import { DataTable } from '@/components/admin';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MoreHorizontal, 
  UserPlus, 
  Eye, 
  Ban, 
  CheckCircle, 
  Key, 
  Trash2,
  Filter
} from 'lucide-react';
import Link from 'next/link';
import { AdminUser, UserFilter } from '@/lib/api/admin';

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

export default function AdminUsersPage() {
  const [filter, setFilter] = useState<UserFilter>({ page: 1, limit: 20 });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useAdminUsers(filter);
  const suspendUser = useSuspendUser();
  const activateUser = useActivateUser();
  const deleteUser = useDeleteAdminUser();

  const handleSearch = (search: string) => {
    setFilter((prev) => ({ ...prev, search, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilter((prev) => ({ ...prev, page }));
  };

  const handleStatusFilter = (status: string) => {
    setFilter((prev) => ({ ...prev, status: status || undefined, page: 1 }));
  };

  const handleRoleFilter = (systemRole: string) => {
    setFilter((prev) => ({ ...prev, systemRole: systemRole || undefined, page: 1 }));
  };

  const columns = [
    {
      key: 'user',
      header: 'User',
      render: (user: AdminUser) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.avatarUrl} />
            <AvatarFallback className="bg-slate-700 text-white text-xs">
              {user.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-white">{user.fullName}</p>
            <p className="text-sm text-slate-400">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'systemRole',
      header: 'Role',
      render: (user: AdminUser) => (
        <Badge className={roleColors[user.systemRole] || roleColors.USER}>
          {user.systemRole.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (user: AdminUser) => (
        <Badge className={statusColors[user.status] || statusColors.PENDING}>
          {user.status}
        </Badge>
      ),
    },
    {
      key: 'emailVerified',
      header: 'Verified',
      render: (user: AdminUser) => (
        <span className={user.emailVerified ? 'text-emerald-400' : 'text-slate-500'}>
          {user.emailVerified ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'familyCount',
      header: 'Families',
      render: (user: AdminUser) => (
        <span className="text-slate-300">{user.familyCount || 0}</span>
      ),
    },
    {
      key: 'lastLoginAt',
      header: 'Last Login',
      render: (user: AdminUser) => (
        <span className="text-slate-400 text-sm">
          {user.lastLoginAt
            ? new Date(user.lastLoginAt).toLocaleDateString()
            : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (user: AdminUser) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/admin/users/${user.id}`}
            className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </Link>
          {user.status === 'ACTIVE' && user.systemRole !== 'SUPER_ADMIN' && (
            <button
              onClick={() => suspendUser.mutate({ id: user.id })}
              className="p-2 rounded-md text-slate-400 hover:text-amber-400 hover:bg-slate-700 transition-colors"
              title="Suspend User"
            >
              <Ban className="w-4 h-4" />
            </button>
          )}
          {user.status === 'SUSPENDED' && (
            <button
              onClick={() => activateUser.mutate(user.id)}
              className="p-2 rounded-md text-slate-400 hover:text-emerald-400 hover:bg-slate-700 transition-colors"
              title="Activate User"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          {user.systemRole !== 'SUPER_ADMIN' && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this user?')) {
                  deleteUser.mutate({ id: user.id });
                }
              }}
              className="p-2 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
              title="Delete User"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
      className: 'w-32',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-slate-400 mt-1">
            Manage all users across the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <Link
            href="/admin/users/new"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </Link>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Status
              </label>
              <select
                value={filter.status || ''}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Role
              </label>
              <select
                value={filter.systemRole || ''}
                onChange={(e) => handleRoleFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Roles</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="ADMIN">Admin</option>
                <option value="MODERATOR">Moderator</option>
                <option value="USER">User</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Email Verified
              </label>
              <select
                value={filter.emailVerified === undefined ? '' : String(filter.emailVerified)}
                onChange={(e) =>
                  setFilter((prev) => ({
                    ...prev,
                    emailVerified: e.target.value === '' ? undefined : e.target.value === 'true',
                    page: 1,
                  }))
                }
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All</option>
                <option value="true">Verified</option>
                <option value="false">Not Verified</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilter({ page: 1, limit: 20 })}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <DataTable
        data={data?.data || []}
        columns={columns}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        searchPlaceholder="Search users by name or email..."
        emptyMessage="No users found"
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        getRowId={(user) => user.id}
      />

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 rounded-xl px-6 py-3 shadow-xl flex items-center gap-4">
          <span className="text-sm text-slate-300">
            {selectedIds.length} user{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // Bulk suspend
              }}
              className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              Suspend
            </button>
            <button
              onClick={() => {
                // Bulk activate
              }}
              className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Activate
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


'use client';

import { useState } from 'react';
import { useAdminUsers, useSuspendUser, useActivateUser, useDeleteAdminUser } from '@/hooks/admin';
import { DataTable } from '@/components/admin';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  UserPlus, 
  Eye, 
  Ban, 
  CheckCircle, 
  Trash2,
  Filter
} from 'lucide-react';
import Link from 'next/link';
import { AdminUser, UserFilter } from '@/lib/api/admin';
import { cn } from '@/lib/utils';

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
          <Avatar className="h-9 w-9 border border-sage-200">
            <AvatarImage src={user.avatarUrl} />
            <AvatarFallback className="bg-sage-100 text-sage-700 text-xs font-medium">
              {user.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">{user.fullName}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'systemRole',
      header: 'Role',
      render: (user: AdminUser) => (
        <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', roleColors[user.systemRole] || roleColors.USER)}>
          {user.systemRole.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (user: AdminUser) => (
        <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', statusColors[user.status] || statusColors.PENDING)}>
          {user.status}
        </span>
      ),
    },
    {
      key: 'emailVerified',
      header: 'Verified',
      render: (user: AdminUser) => (
        <span className={user.emailVerified ? 'text-sage' : 'text-muted-foreground'}>
          {user.emailVerified ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'familyCount',
      header: 'Families',
      render: (user: AdminUser) => (
        <span className="text-foreground">{user.familyCount || 0}</span>
      ),
    },
    {
      key: 'lastLoginAt',
      header: 'Last Login',
      render: (user: AdminUser) => (
        <span className="text-muted-foreground text-sm">
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
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sage-100 transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </Link>
          {user.status === 'ACTIVE' && user.systemRole !== 'SUPER_ADMIN' && (
            <button
              onClick={() => suspendUser.mutate({ id: user.id })}
              className="p-2 rounded-lg text-muted-foreground hover:text-warning hover:bg-warning/10 transition-colors"
              title="Suspend User"
            >
              <Ban className="w-4 h-4" />
            </button>
          )}
          {user.status === 'SUSPENDED' && (
            <button
              onClick={() => activateUser.mutate(user.id)}
              className="p-2 rounded-lg text-muted-foreground hover:text-sage hover:bg-sage/10 transition-colors"
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
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
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
          <h1 className="font-editorial text-3xl text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage all users across the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors',
              showFilters
                ? 'bg-sage border-sage text-white'
                : 'border-sage-200 text-foreground hover:bg-sage-100'
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <Link
            href="/admin/users/new"
            className="flex items-center gap-2 px-4 py-2 bg-sage text-white rounded-xl hover:bg-sage/90 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </Link>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="dashboard-card">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Status
              </label>
              <select
                value={filter.status || ''}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-sage-50 border border-sage-200 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-sage"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Role
              </label>
              <select
                value={filter.systemRole || ''}
                onChange={(e) => handleRoleFilter(e.target.value)}
                className="w-full px-3 py-2 bg-sage-50 border border-sage-200 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-sage"
              >
                <option value="">All Roles</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="ADMIN">Admin</option>
                <option value="MODERATOR">Moderator</option>
                <option value="USER">User</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
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
                className="w-full px-3 py-2 bg-sage-50 border border-sage-200 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-sage"
              >
                <option value="">All</option>
                <option value="true">Verified</option>
                <option value="false">Not Verified</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilter({ page: 1, limit: 20 })}
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card border border-sage-200 rounded-2xl px-6 py-3 shadow-warm-glow flex items-center gap-4">
          <span className="text-sm text-foreground">
            {selectedIds.length} user{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // Bulk suspend
              }}
              className="px-3 py-1.5 text-sm bg-warning text-white rounded-xl hover:bg-warning/90 transition-colors"
            >
              Suspend
            </button>
            <button
              onClick={() => {
                // Bulk activate
              }}
              className="px-3 py-1.5 text-sm bg-sage text-white rounded-xl hover:bg-sage/90 transition-colors"
            >
              Activate
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

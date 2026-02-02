'use client';

import { useState } from 'react';
import { useAdminFamilies, useDeleteAdminFamily } from '@/hooks/admin';
import { DataTable } from '@/components/admin';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Eye, Trash2, Users, Heart, FileText } from 'lucide-react';
import Link from 'next/link';
import { AdminFamily, FamilyFilter } from '@/lib/api/admin';

export default function AdminFamiliesPage() {
  const [filter, setFilter] = useState<FamilyFilter>({ page: 1, limit: 20 });

  const { data, isLoading } = useAdminFamilies(filter);
  const deleteFamily = useDeleteAdminFamily();

  const handleSearch = (search: string) => {
    setFilter((prev) => ({ ...prev, search, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilter((prev) => ({ ...prev, page }));
  };

  const columns = [
    {
      key: 'family',
      header: 'Family',
      render: (family: AdminFamily) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-teal-600 text-white">
              {family.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-white">{family.name}</p>
            <p className="text-sm text-slate-400">
              Created {new Date(family.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'admin',
      header: 'Admin',
      render: (family: AdminFamily) => (
        <div>
          {family.admin ? (
            <>
              <p className="text-white">{family.admin.fullName}</p>
              <p className="text-sm text-slate-400">{family.admin.email}</p>
            </>
          ) : (
            <span className="text-slate-500">No admin</span>
          )}
        </div>
      ),
    },
    {
      key: 'memberCount',
      header: 'Members',
      render: (family: AdminFamily) => (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />
          <span className="text-slate-300">{family.memberCount}</span>
        </div>
      ),
    },
    {
      key: 'careRecipientCount',
      header: 'Care Recipients',
      render: (family: AdminFamily) => (
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-slate-400" />
          <span className="text-slate-300">{family.careRecipientCount}</span>
        </div>
      ),
    },
    {
      key: 'documentCount',
      header: 'Documents',
      render: (family: AdminFamily) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400" />
          <span className="text-slate-300">{family.documentCount}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (family: AdminFamily) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/admin/families/${family.id}`}
            className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this family? This will remove all associated data.')) {
                deleteFamily.mutate({ id: family.id });
              }
            }}
            className="p-2 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
            title="Delete Family"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      className: 'w-24',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Family Management</h1>
        <p className="text-slate-400 mt-1">
          Manage all family spaces across the platform
        </p>
      </div>

      {/* Families Table */}
      <DataTable
        data={data?.data || []}
        columns={columns}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        searchPlaceholder="Search families by name..."
        emptyMessage="No families found"
        getRowId={(family) => family.id}
      />
    </div>
  );
}


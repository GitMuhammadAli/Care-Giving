'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAdminFamily, useAdminFamilyMembers, useRemoveFamilyMember, useTransferOwnership } from '@/hooks/admin';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Users,
  Heart,
  FileText,
  Calendar,
  UserMinus,
  Crown,
} from 'lucide-react';
import Link from 'next/link';

const roleColors: Record<string, string> = {
  ADMIN: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  CAREGIVER: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  VIEWER: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export default function AdminFamilyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const familyId = params.id as string;

  const { data: family, isLoading } = useAdminFamily(familyId);
  const removeMember = useRemoveFamilyMember();
  const transferOwnership = useTransferOwnership();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!family) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Family not found</p>
        <Link href="/admin/families" className="text-emerald-400 hover:underline mt-2 inline-block">
          Back to Families
        </Link>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-white">{family.name}</h1>
          <p className="text-slate-400 mt-1">
            Created {new Date(family.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-sm">Members</span>
          </div>
          <p className="text-2xl font-bold text-white">{family._count?.members || 0}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Heart className="w-4 h-4" />
            <span className="text-sm">Care Recipients</span>
          </div>
          <p className="text-2xl font-bold text-white">{family._count?.careRecipients || 0}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <FileText className="w-4 h-4" />
            <span className="text-sm">Documents</span>
          </div>
          <p className="text-2xl font-bold text-white">{family._count?.documents || 0}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Pending Invites</span>
          </div>
          <p className="text-2xl font-bold text-white">{family.invitations?.length || 0}</p>
        </div>
      </div>

      {/* Members */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Family Members</h3>
        <div className="space-y-3">
          {family.members?.map((member: any) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.user?.avatarUrl} />
                  <AvatarFallback className="bg-slate-600 text-white">
                    {member.user?.fullName?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/users/${member.user?.id}`}
                      className="font-medium text-white hover:text-emerald-400 transition-colors"
                    >
                      {member.user?.fullName}
                    </Link>
                    {member.role === 'ADMIN' && (
                      <span title="Family Admin">
                        <Crown className="w-4 h-4 text-amber-400" />
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400">{member.user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={roleColors[member.role] || roleColors.VIEWER}>
                  {member.role}
                </Badge>
                <div className="flex items-center gap-1">
                  {member.role !== 'ADMIN' && (
                    <button
                      onClick={() => {
                        if (confirm('Transfer admin rights to this member?')) {
                          transferOwnership.mutate({
                            familyId,
                            newOwnerId: member.user?.id,
                          });
                        }
                      }}
                      className="p-2 rounded-md text-slate-400 hover:text-amber-400 hover:bg-slate-700 transition-colors"
                      title="Make Admin"
                    >
                      <Crown className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Remove this member from the family?')) {
                        removeMember.mutate({ familyId, memberId: member.id });
                      }
                    }}
                    className="p-2 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
                    title="Remove Member"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {(!family.members || family.members.length === 0) && (
            <p className="text-center text-slate-400 py-4">No members in this family</p>
          )}
        </div>
      </div>

      {/* Care Recipients */}
      {family.careRecipients && family.careRecipients.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Care Recipients</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {family.careRecipients.map((recipient: any) => (
              <div
                key={recipient.id}
                className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-lg"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={recipient.photoUrl} />
                  <AvatarFallback className="bg-rose-600 text-white">
                    {recipient.fullName?.split(' ').map((n: string) => n[0]).join('') || 'CR'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-white">{recipient.fullName}</p>
                  {recipient.preferredName && (
                    <p className="text-sm text-slate-400">"{recipient.preferredName}"</p>
                  )}
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                    <span>{recipient._count?.medications || 0} medications</span>
                    <span>{recipient._count?.appointments || 0} appointments</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Invitations */}
      {family.invitations && family.invitations.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Pending Invitations</h3>
          <div className="space-y-3">
            {family.invitations.map((invitation: any) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg"
              >
                <div>
                  <p className="text-white">{invitation.email}</p>
                  <p className="text-sm text-slate-400">
                    Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge className={roleColors[invitation.role] || roleColors.VIEWER}>
                  {invitation.role}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAdminFamily, useRemoveFamilyMember, useTransferOwnership } from '@/hooks/admin';
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
import { cn } from '@/lib/utils';

const roleColors: Record<string, string> = {
  ADMIN: 'bg-sage/10 text-sage border-sage/20',
  CAREGIVER: 'bg-terracotta/10 text-terracotta border-terracotta/20',
  VIEWER: 'bg-muted text-muted-foreground border-muted',
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage" />
      </div>
    );
  }

  if (!family) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Family not found</p>
        <Link href="/admin/families" className="text-sage hover:underline mt-2 inline-block">
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
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-sage-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-editorial text-2xl text-foreground">{family.name}</h1>
          <p className="text-muted-foreground mt-1">
            Created {new Date(family.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="dashboard-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Users className="w-4 h-4" />
            <span className="text-sm">Members</span>
          </div>
          <p className="text-2xl font-editorial text-foreground">{family._count?.members || 0}</p>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Heart className="w-4 h-4 text-terracotta" />
            <span className="text-sm">Care Recipients</span>
          </div>
          <p className="text-2xl font-editorial text-foreground">{family._count?.careRecipients || 0}</p>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <FileText className="w-4 h-4" />
            <span className="text-sm">Documents</span>
          </div>
          <p className="text-2xl font-editorial text-foreground">{family._count?.documents || 0}</p>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Pending Invites</span>
          </div>
          <p className="text-2xl font-editorial text-foreground">{family.invitations?.length || 0}</p>
        </div>
      </div>

      {/* Members */}
      <div className="dashboard-card">
        <h3 className="font-medium text-foreground mb-4">Family Members</h3>
        <div className="space-y-3">
          {family.members?.map((member: any) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 bg-sage-50 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-sage-200">
                  <AvatarImage src={member.user?.avatarUrl} />
                  <AvatarFallback className="bg-sage-100 text-sage-700 font-medium">
                    {member.user?.fullName?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/users/${member.user?.id}`}
                      className="font-medium text-foreground hover:text-sage transition-colors"
                    >
                      {member.user?.fullName}
                    </Link>
                    {member.role === 'ADMIN' && (
                      <span title="Family Admin">
                        <Crown className="w-4 h-4 text-warning" />
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{member.user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', roleColors[member.role] || roleColors.VIEWER)}>
                  {member.role}
                </span>
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
                      className="p-2 rounded-lg text-muted-foreground hover:text-warning hover:bg-warning/10 transition-colors"
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
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Remove Member"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {(!family.members || family.members.length === 0) && (
            <p className="text-center text-muted-foreground py-4">No members in this family</p>
          )}
        </div>
      </div>

      {/* Care Recipients */}
      {family.careRecipients && family.careRecipients.length > 0 && (
        <div className="dashboard-card">
          <h3 className="font-medium text-foreground mb-4">Care Recipients</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {family.careRecipients.map((recipient: any) => (
              <div
                key={recipient.id}
                className="flex items-center gap-4 p-4 bg-sage-50 rounded-xl"
              >
                <Avatar className="h-12 w-12 border border-terracotta/20">
                  <AvatarImage src={recipient.photoUrl} />
                  <AvatarFallback className="bg-terracotta/10 text-terracotta font-medium">
                    {recipient.fullName?.split(' ').map((n: string) => n[0]).join('') || 'CR'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{recipient.fullName}</p>
                  {recipient.preferredName && (
                    <p className="text-sm text-muted-foreground">"{recipient.preferredName}"</p>
                  )}
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
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
        <div className="dashboard-card">
          <h3 className="font-medium text-foreground mb-4">Pending Invitations</h3>
          <div className="space-y-3">
            {family.invitations.map((invitation: any) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 bg-sage-50 rounded-xl"
              >
                <div>
                  <p className="text-foreground">{invitation.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', roleColors[invitation.role] || roleColors.VIEWER)}>
                  {invitation.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

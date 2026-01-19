'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Mail,
  Crown,
  UserCheck,
  Eye,
  MoreVertical,
  Clock,
  RefreshCw,
  X,
  Send,
  KeyRound,
  AlertCircle,
  Trash2,
  Shield,
} from 'lucide-react';
import { useFamilyMembers, usePendingInvitations, useInviteMember, useResetMemberPassword, useRemoveMember, useCancelInvitation, useResendInvitation } from '@/hooks/use-family';
import { useAuthContext } from '@/components/providers/auth-provider';
import { toast } from 'react-hot-toast';

const roleConfig = {
  ADMIN: {
    label: 'Admin',
    icon: Crown,
    color: 'bg-accent-primary-light text-accent-primary',
    description: 'Can manage family, invite members, edit all',
  },
  CAREGIVER: {
    label: 'Caregiver',
    icon: UserCheck,
    color: 'bg-success-light text-success',
    description: 'Can log medications, add notes, manage schedule',
  },
  VIEWER: {
    label: 'Viewer',
    icon: Eye,
    color: 'bg-bg-muted text-text-secondary',
    description: 'Can view all information but not make changes',
  },
};

export default function FamilyPage() {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'CAREGIVER' | 'VIEWER'>('CAREGIVER');

  // Password reset modal state
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedMemberForReset, setSelectedMemberForReset] = useState<{ id: string; name: string; email: string } | null>(null);

  // Menu dropdown state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Get user and family info from auth context
  const { user } = useAuthContext();
  const userFamily = user?.families?.[0]; // Get first family
  const familyId = userFamily?.id || '';
  const currentUserRole = userFamily?.role || 'VIEWER';
  const currentUserId = user?.id || '';

  // Hooks
  const { data: members = [], isLoading: membersLoading } = useFamilyMembers(familyId);
  const { data: invitations = [], isLoading: invitationsLoading } = usePendingInvitations(familyId);
  const inviteMember = useInviteMember(familyId);
  const resetPassword = useResetMemberPassword(familyId);
  const removeMember = useRemoveMember(familyId);
  const cancelInvitation = useCancelInvitation(familyId);
  const resendInvitation = useResendInvitation(familyId);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail) return;

    await inviteMember.mutateAsync({
      email: inviteEmail,
      role: inviteRole,
    });

    setIsInviteModalOpen(false);
    setInviteEmail('');
    setInviteRole('CAREGIVER');
  };

  const handleResetPassword = async () => {
    if (!selectedMemberForReset) return;

    await resetPassword.mutateAsync(selectedMemberForReset.id);

    setIsResetPasswordModalOpen(false);
    setSelectedMemberForReset(null);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (confirm('Are you sure you want to remove this member?')) {
      await removeMember.mutateAsync(memberId);
      setOpenMenuId(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    await cancelInvitation.mutateAsync(invitationId);
  };

  const handleResendInvitation = async (invitationId: string) => {
    await resendInvitation.mutateAsync(invitationId);
  };

  const openResetPasswordModal = (member: { id: string; name: string; email: string }) => {
    setSelectedMemberForReset(member);
    setIsResetPasswordModalOpen(true);
    setOpenMenuId(null);
  };

  return (
    <div className="pb-6">
      <PageHeader
        title="Family"
        subtitle="Manage your care circle"
        actions={
          <Button
            variant="primary"
            size="default"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsInviteModalOpen(true)}
          >
            Invite Member
          </Button>
        }
      />

      <div className="px-4 sm:px-6 py-6 space-y-6">
        {/* Family Members */}
        <div>
          <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wide mb-4">
            Family Members ({members.length})
          </h3>
          {membersLoading ? (
            <div className="text-center py-8 text-text-secondary">Loading members...</div>
          ) : members.length === 0 ? (
            <Card>
              <div className="text-center py-8 text-text-secondary">
                No family members yet. Invite someone to get started!
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {members.map((member) => {
                const role = roleConfig[member.role as keyof typeof roleConfig];
                const RoleIcon = role.icon;
                const isCurrentUser = member.userId === currentUserId;
                const isMenuOpen = openMenuId === member.id;

                return (
                  <div key={member.id}>
                    <Card variant="interactive">
                      <div className="flex items-center gap-4">
                        <Avatar
                          name={member.user.fullName}
                          size="lg"
                          showStatus={false}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-text-primary truncate">
                              {member.user.fullName}
                            </h4>
                            {isCurrentUser && (
                              <span className="text-xs text-text-tertiary">(You)</span>
                            )}
                          </div>
                          <p className="text-sm text-text-secondary truncate">{member.user.email}</p>
                          <p className="text-xs text-text-tertiary mt-0.5">
                            Joined {new Date(member.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={role.color}>
                            <RoleIcon className="w-3.5 h-3.5 mr-1" />
                            {role.label}
                          </Badge>
                          {!isCurrentUser && currentUserRole === 'ADMIN' && (
                            <div className="relative" ref={isMenuOpen ? menuRef : null}>
                              <button
                                onClick={() => setOpenMenuId(isMenuOpen ? null : member.id)}
                                className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-muted transition-colors"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>

                              <AnimatePresence>
                                {isMenuOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-border-default z-50 overflow-hidden"
                                  >
                                    <div className="py-1">
                                      <button
                                        onClick={() => openResetPasswordModal({
                                          id: member.userId,
                                          name: member.user.fullName,
                                          email: member.user.email,
                                        })}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-subtle transition-colors"
                                      >
                                        <div className="w-8 h-8 rounded-lg bg-accent-primary-light flex items-center justify-center">
                                          <KeyRound className="w-4 h-4 text-accent-primary" />
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-text-primary">Reset Password</p>
                                          <p className="text-xs text-text-secondary">Send temporary password</p>
                                        </div>
                                      </button>
                                      <button
                                        onClick={() => handleRemoveMember(member.id)}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-error-light transition-colors"
                                      >
                                        <div className="w-8 h-8 rounded-lg bg-error-light flex items-center justify-center">
                                          <Trash2 className="w-4 h-4 text-error" />
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-error">Remove Member</p>
                                          <p className="text-xs text-text-secondary">Remove from family</p>
                                        </div>
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wide mb-4">
              Pending Invitations ({invitations.length})
            </h3>
            <div className="space-y-3">
              {invitations.map((invite) => (
                <Card key={invite.id} variant="highlighted">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-accent-warm-light flex items-center justify-center">
                      <Mail className="w-6 h-6 text-accent-warm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-text-primary">{invite.email}</h4>
                      <p className="text-sm text-text-secondary">
                        Invited as {roleConfig[invite.role as keyof typeof roleConfig].label}
                      </p>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        <Clock className="w-3 h-3 inline mr-1" />
                        Sent {new Date(invite.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<RefreshCw className={cn("w-4 h-4", resendInvitation.isPending && "animate-spin")} />}
                        onClick={() => handleResendInvitation(invite.id)}
                        disabled={resendInvitation.isPending || cancelInvitation.isPending}
                      >
                        Resend
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<X className="w-4 h-4" />}
                        onClick={() => handleCancelInvitation(invite.id)}
                        disabled={resendInvitation.isPending || cancelInvitation.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Family Member"
        description="Send an invitation to join your care circle"
        size="md"
      >
        <div className="space-y-5">
          <Input
            label="Email Address"
            type="email"
            placeholder="family@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            leftIcon={<Mail className="w-5 h-5" />}
            inputSize="lg"
          />

          <div>
            <label className="block text-sm font-medium text-text-primary mb-3">
              Role
            </label>
            <div className="space-y-2">
              {Object.entries(roleConfig).map(([key, config]) => {
                const Icon = config.icon;
                const isSelected = inviteRole === key;

                return (
                  <button
                    key={key}
                    onClick={() => setInviteRole(key as typeof inviteRole)}
                    className={cn(
                      'w-full flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left',
                      isSelected
                        ? 'border-accent-primary bg-accent-primary-light/50'
                        : 'border-border-default hover:border-border-strong'
                    )}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                      config.color
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">{config.label}</p>
                      <p className="text-sm text-text-secondary">{config.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => setIsInviteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleInvite}
              disabled={!inviteEmail || inviteMember.isPending}
              leftIcon={<Send className="w-5 h-5" />}
            >
              {inviteMember.isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Confirmation Modal */}
      <Modal
        isOpen={isResetPasswordModalOpen}
        onClose={() => setIsResetPasswordModalOpen(false)}
        title="Reset Member Password"
        description="This will send a temporary password to the member's email"
        size="md"
      >
        {selectedMemberForReset && (
          <div className="space-y-5">
            <div className="rounded-xl bg-accent-warm-light p-4 border border-accent-warm/20">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-accent-warm" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-text-primary mb-1">
                    About Password Reset
                  </h4>
                  <ul className="text-sm text-text-secondary space-y-1">
                    <li>• A secure temporary password will be generated</li>
                    <li>• Password will be sent to: <strong>{selectedMemberForReset.email}</strong></li>
                    <li>• Member will be required to change it on next login</li>
                    <li>• This action cannot be undone</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-bg-subtle p-4">
              <div className="flex items-center gap-3">
                <Avatar name={selectedMemberForReset.name} size="md" />
                <div>
                  <p className="font-medium text-text-primary">{selectedMemberForReset.name}</p>
                  <p className="text-sm text-text-secondary">{selectedMemberForReset.email}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => setIsResetPasswordModalOpen(false)}
                disabled={resetPassword.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleResetPassword}
                disabled={resetPassword.isPending}
                leftIcon={<KeyRound className="w-5 h-5" />}
              >
                {resetPassword.isPending ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

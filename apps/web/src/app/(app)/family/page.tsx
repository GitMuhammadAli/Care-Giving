'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Home,
  ChevronDown,
  Check,
  UserCog,
} from 'lucide-react';
import { useFamilyMembers, usePendingInvitations, useInviteMember, useResetMemberPassword, useRemoveMember, useCancelInvitation, useResendInvitation, useDeleteFamily, useUpdateMemberRole } from '@/hooks/use-family';
import { useAuthContext } from '@/components/providers/auth-provider';
import { useRouter, useSearchParams } from 'next/navigation';
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

function FamilyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'CAREGIVER' | 'VIEWER'>('CAREGIVER');

  // Password reset modal state
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedMemberForReset, setSelectedMemberForReset] = useState<{ id: string; name: string; email: string } | null>(null);

  // Delete family modal state
  const [isDeleteFamilyModalOpen, setIsDeleteFamilyModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Role change modal state
  const [isRoleChangeModalOpen, setIsRoleChangeModalOpen] = useState(false);
  const [selectedMemberForRole, setSelectedMemberForRole] = useState<{ id: string; memberId: string; name: string; currentRole: string } | null>(null);
  const [newRole, setNewRole] = useState<'ADMIN' | 'CAREGIVER' | 'VIEWER'>('CAREGIVER');

  // Menu dropdown state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Get user and family info from auth context
  const { user } = useAuthContext();
  const families = user?.families || [];
  const currentUserId = user?.id || '';

  // Multi-space support: Get familyId from URL query param or use first family
  const spaceIdFromUrl = searchParams.get('space');
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(spaceIdFromUrl);

  // Auto-select first family if none selected or invalid
  useEffect(() => {
    if (families.length > 0) {
      const validFamily = families.find(f => f.id === selectedFamilyId);
      if (!validFamily) {
        const targetId = spaceIdFromUrl && families.find(f => f.id === spaceIdFromUrl)
          ? spaceIdFromUrl
          : families[0].id;
        setSelectedFamilyId(targetId);
      }
    }
  }, [families, selectedFamilyId, spaceIdFromUrl]);

  // Get current family details
  const currentFamily = families.find(f => f.id === selectedFamilyId) || families[0];
  const familyId = currentFamily?.id || '';
  const familyName = currentFamily?.name || '';
  const currentUserRole = currentFamily?.role || 'VIEWER';
  const isAdmin = currentUserRole === 'ADMIN';

  // Handle family switch
  const handleFamilySwitch = (newFamilyId: string) => {
    setSelectedFamilyId(newFamilyId);
    router.push(`/family?space=${newFamilyId}`);
  };

  // Hooks
  const { data: members = [], isLoading: membersLoading } = useFamilyMembers(familyId);
  const { data: invitations = [], isLoading: invitationsLoading } = usePendingInvitations(familyId);
  const inviteMember = useInviteMember(familyId);
  const resetPassword = useResetMemberPassword(familyId);
  const removeMember = useRemoveMember(familyId);
  const cancelInvitation = useCancelInvitation(familyId);
  const resendInvitation = useResendInvitation(familyId);
  const deleteFamily = useDeleteFamily({
    onSuccessCallback: () => {
      // Navigate BEFORE state updates to prevent page re-renders
      router.replace('/dashboard');
    },
  });
  const updateMemberRole = useUpdateMemberRole(familyId);

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

  const openRoleChangeModal = (member: { id: string; memberId: string; name: string; currentRole: string }) => {
    setSelectedMemberForRole(member);
    setNewRole(member.currentRole as 'ADMIN' | 'CAREGIVER' | 'VIEWER');
    setIsRoleChangeModalOpen(true);
    setOpenMenuId(null);
  };

  const handleRoleChange = async () => {
    if (!selectedMemberForRole || newRole === selectedMemberForRole.currentRole) return;

    await updateMemberRole.mutateAsync({
      memberId: selectedMemberForRole.memberId,
      role: newRole,
    });

    setIsRoleChangeModalOpen(false);
    setSelectedMemberForRole(null);
  };

  const handleDeleteFamily = async () => {
    if (deleteConfirmText !== familyName) return;

    // Close modal and reset state before mutation
    // Navigation is handled by the onSuccessCallback in useDeleteFamily
    setIsDeleteFamilyModalOpen(false);
    setDeleteConfirmText('');

    await deleteFamily.mutateAsync(familyId);
  };

  return (
    <div className="pb-6">
      <PageHeader
        title="Family Members"
        subtitle="Manage members in your care circle"
        actions={
          isAdmin ? (
            <Button
              variant="primary"
              size="default"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsInviteModalOpen(true)}
            >
              Invite Member
            </Button>
          ) : null
        }
      />

      {/* Space Selector - Show if user has multiple spaces */}
      {families.length > 0 && (
        <div className="px-4 sm:px-6 py-4 border-b border-border-default">
          <div className="flex flex-wrap items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 px-4 rounded-xl">
                  <Home className="w-4 h-4 mr-2 text-accent-primary" />
                  <span className="font-medium">{currentFamily?.name || 'Select Space'}</span>
                  <ChevronDown className="w-4 h-4 ml-2 text-text-tertiary" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 rounded-xl">
                <DropdownMenuLabel className="text-xs text-text-tertiary uppercase tracking-wide">
                  Your Family Spaces
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {families.map((family) => (
                  <DropdownMenuItem
                    key={family.id}
                    onClick={() => handleFamilySwitch(family.id)}
                    className="cursor-pointer rounded-lg"
                  >
                    <Home className="w-4 h-4 mr-2 text-text-tertiary" />
                    <span className="flex-1">{family.name}</span>
                    <Badge className={cn(
                      'text-xs ml-2',
                      roleConfig[family.role as keyof typeof roleConfig]?.color || 'bg-bg-muted'
                    )}>
                      {roleConfig[family.role as keyof typeof roleConfig]?.label || family.role}
                    </Badge>
                    {family.id === familyId && (
                      <Check className="w-4 h-4 text-accent-primary ml-2" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Current Role Badge */}
            <Badge className={cn(
              'text-sm py-1.5 px-3',
              roleConfig[currentUserRole as keyof typeof roleConfig]?.color || 'bg-bg-muted'
            )}>
              {(() => {
                const role = roleConfig[currentUserRole as keyof typeof roleConfig];
                const RoleIcon = role?.icon || Eye;
                return (
                  <>
                    <RoleIcon className="w-3.5 h-3.5 mr-1.5" />
                    Your Role: {role?.label || currentUserRole}
                  </>
                );
              })()}
            </Badge>
          </div>
        </div>
      )}

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
                          {!isCurrentUser && isAdmin && (
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
                                        onClick={() => openRoleChangeModal({
                                          id: member.userId,
                                          memberId: member.id,
                                          name: member.user.fullName,
                                          currentRole: member.role,
                                        })}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-subtle transition-colors"
                                      >
                                        <div className="w-8 h-8 rounded-lg bg-success-light flex items-center justify-center">
                                          <UserCog className="w-4 h-4 text-success" />
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-text-primary">Change Role</p>
                                          <p className="text-xs text-text-secondary">Currently: {roleConfig[member.role as keyof typeof roleConfig]?.label}</p>
                                        </div>
                                      </button>
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

        {/* Danger Zone - Only show for admins */}
        {isAdmin && (
          <div className="pt-6 border-t border-border-default">
            <h3 className="text-sm font-semibold text-error uppercase tracking-wide mb-4">
              Danger Zone
            </h3>
            <Card className="border-error/30 bg-error/5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-error/10 flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-error" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary">Delete Family</h4>
                    <p className="text-sm text-text-secondary">
                      Permanently delete this family and all its data
                    </p>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="default"
                  onClick={() => setIsDeleteFamilyModalOpen(true)}
                >
                  Delete Family
                </Button>
              </div>
            </Card>
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

      {/* Delete Family Confirmation Modal */}
      <Modal
        isOpen={isDeleteFamilyModalOpen}
        onClose={() => {
          setIsDeleteFamilyModalOpen(false);
          setDeleteConfirmText('');
        }}
        title="Delete Family"
        description="This action cannot be undone"
        size="md"
      >
        <div className="space-y-5">
          <div className="rounded-xl bg-error/10 p-4 border border-error/20">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-error" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-text-primary mb-1">
                  Warning: This will permanently delete
                </h4>
                <ul className="text-sm text-text-secondary space-y-1">
                  <li>• All family members will lose access</li>
                  <li>• All loved ones and their profiles</li>
                  <li>• All medications, appointments, and documents</li>
                  <li>• All activity history and notes</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Type <strong>{familyName}</strong> to confirm
            </label>
            <Input
              type="text"
              placeholder={familyName}
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              inputSize="lg"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => {
                setIsDeleteFamilyModalOpen(false);
                setDeleteConfirmText('');
              }}
              disabled={deleteFamily.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="lg"
              fullWidth
              onClick={handleDeleteFamily}
              disabled={deleteConfirmText !== familyName || deleteFamily.isPending}
              leftIcon={<Trash2 className="w-5 h-5" />}
            >
              {deleteFamily.isPending ? 'Deleting...' : 'Delete Forever'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Role Change Modal */}
      <Modal
        isOpen={isRoleChangeModalOpen}
        onClose={() => {
          setIsRoleChangeModalOpen(false);
          setSelectedMemberForRole(null);
        }}
        title="Change Member Role"
        description="Update the role for this family member"
        size="md"
      >
        {selectedMemberForRole && (
          <div className="space-y-5">
            <div className="rounded-xl bg-bg-subtle p-4">
              <div className="flex items-center gap-3">
                <Avatar name={selectedMemberForRole.name} size="md" />
                <div>
                  <p className="font-medium text-text-primary">{selectedMemberForRole.name}</p>
                  <p className="text-sm text-text-secondary">
                    Current Role: {roleConfig[selectedMemberForRole.currentRole as keyof typeof roleConfig]?.label}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-3">
                New Role
              </label>
              <div className="space-y-2">
                {Object.entries(roleConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  const isSelected = newRole === key;
                  const isCurrent = selectedMemberForRole.currentRole === key;

                  return (
                    <button
                      key={key}
                      onClick={() => setNewRole(key as typeof newRole)}
                      className={cn(
                        'w-full flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left',
                        isSelected
                          ? 'border-accent-primary bg-accent-primary-light/50'
                          : 'border-border-default hover:border-border-strong',
                        isCurrent && 'opacity-50'
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                        config.color
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-text-primary">{config.label}</p>
                          {isCurrent && (
                            <Badge className="text-xs bg-bg-muted text-text-tertiary">Current</Badge>
                          )}
                        </div>
                        <p className="text-sm text-text-secondary">{config.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {newRole === 'ADMIN' && selectedMemberForRole.currentRole !== 'ADMIN' && (
              <div className="rounded-xl bg-accent-warm-light p-4 border border-accent-warm/20">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-accent-warm flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">Granting Admin Access</p>
                    <p className="text-sm text-text-secondary">
                      This person will be able to manage all family settings, invite/remove members, and delete the family.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => {
                  setIsRoleChangeModalOpen(false);
                  setSelectedMemberForRole(null);
                }}
                disabled={updateMemberRole.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleRoleChange}
                disabled={newRole === selectedMemberForRole.currentRole || updateMemberRole.isPending}
                leftIcon={<UserCog className="w-5 h-5" />}
              >
                {updateMemberRole.isPending ? 'Updating...' : 'Update Role'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function FamilyPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage" />
      </div>
    }>
      <FamilyContent />
    </Suspense>
  );
}

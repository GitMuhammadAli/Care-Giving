'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
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
  Users,
  Crown,
  UserCheck,
  Eye,
  MoreVertical,
  Clock,
  RefreshCw,
  X,
  Send,
} from 'lucide-react';

const mockFamilyMembers = [
  {
    id: 'u-1',
    name: 'Sarah Thompson',
    email: 'sarah@example.com',
    role: 'ADMIN',
    isCurrentUser: true,
    status: 'online',
    lastSeen: null,
  },
  {
    id: 'u-2',
    name: 'Mike Thompson',
    email: 'mike@example.com',
    role: 'CAREGIVER',
    isCurrentUser: false,
    status: 'offline',
    lastSeen: '2 hours ago',
  },
  {
    id: 'u-3',
    name: 'Jennifer Thompson',
    email: 'jennifer@example.com',
    role: 'VIEWER',
    isCurrentUser: false,
    status: 'offline',
    lastSeen: 'Yesterday',
  },
];

const mockPendingInvites = [
  {
    id: 'inv-1',
    email: 'david@example.com',
    role: 'CAREGIVER',
    invitedAt: '2 days ago',
  },
];

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

  const handleInvite = async () => {
    console.log('Inviting:', { email: inviteEmail, role: inviteRole });
    // TODO: Call API
    setIsInviteModalOpen(false);
    setInviteEmail('');
    setInviteRole('CAREGIVER');
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
            Family Members ({mockFamilyMembers.length})
          </h3>
          <div className="space-y-3">
            {mockFamilyMembers.map((member, index) => {
              const role = roleConfig[member.role as keyof typeof roleConfig];
              const RoleIcon = role.icon;

              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card variant="interactive">
                    <div className="flex items-center gap-4">
                      <Avatar
                        name={member.name}
                        size="lg"
                        showStatus={member.status === 'online'} status="online"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-text-primary truncate">
                            {member.name}
                          </h4>
                          {member.isCurrentUser && (
                            <span className="text-xs text-text-tertiary">(You)</span>
                          )}
                        </div>
                        <p className="text-sm text-text-secondary truncate">{member.email}</p>
                        <p className="text-xs text-text-tertiary mt-0.5">
                          {member.status === 'online' ? (
                            <span className="text-success">Active now</span>
                          ) : (
                            `Last seen ${member.lastSeen}`
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={role.color}>
                          <RoleIcon className="w-3.5 h-3.5 mr-1" />
                          {role.label}
                        </Badge>
                        {!member.isCurrentUser && (
                          <button className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-muted transition-colors">
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Pending Invitations */}
        {mockPendingInvites.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wide mb-4">
              Pending Invitations ({mockPendingInvites.length})
            </h3>
            <div className="space-y-3">
              {mockPendingInvites.map((invite) => (
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
                        Sent {invite.invitedAt}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />}>
                        Resend
                      </Button>
                      <Button variant="ghost" size="sm" leftIcon={<X className="w-4 h-4" />}>
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
              disabled={!inviteEmail}
              leftIcon={<Send className="w-5 h-5" />}
            >
              Send Invitation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


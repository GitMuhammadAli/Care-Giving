'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Users } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api/client';
import toast from 'react-hot-toast';
import { FAMILY_ROLE_OPTIONS as ROLES, DEFAULT_FAMILY_ROLE } from '@/lib/constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
}

export function InviteMemberModal({ isOpen, onClose, familyId }: Props) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(DEFAULT_FAMILY_ROLE);
  const [message, setMessage] = useState('');

  const mutation = useMutation({
    mutationFn: (data: { email: string; role: string; message?: string }) =>
      api.post(`/families/${familyId}/invite`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', familyId] });
      toast.success(`Invitation sent to ${email}`);
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send invitation');
    },
  });

  const resetForm = () => {
    setEmail('');
    setRole(DEFAULT_FAMILY_ROLE);
    setMessage('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      email,
      role,
      message: message || undefined,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite Family Member" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-accent-primary-light rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-accent-primary" />
          </div>
        </div>

        {/* Email */}
        <div>
          <Input
            label="Email Address *"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="family@example.com"
            leftIcon={<Mail className="w-5 h-5" />}
            required
          />
        </div>

        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-3">
            Role
          </label>
          <div className="space-y-2">
            {ROLES.map((roleOption) => (
              <button
                key={roleOption.value}
                type="button"
                onClick={() => setRole(roleOption.value)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  role === roleOption.value
                    ? 'border-accent-primary bg-accent-primary-light'
                    : 'border-border hover:border-accent-primary/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{roleOption.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium text-text-primary">{roleOption.label}</p>
                    <p className="text-sm text-text-secondary">{roleOption.description}</p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      role === roleOption.value
                        ? 'border-accent-primary bg-accent-primary'
                        : 'border-border'
                    }`}
                  >
                    {role === roleOption.value && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Personal Message */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Personal Message (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-border bg-bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary resize-none"
            rows={3}
            placeholder="Add a personal note to your invitation..."
          />
        </div>

        {/* Info Box */}
        <div className="p-4 bg-info-light rounded-lg">
          <p className="text-sm text-text-primary">
            📧 An email will be sent with a link to join your family. The invitation will expire in 7 days.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={mutation.isPending}>
            Send Invitation
          </Button>
        </div>
      </form>
    </Modal>
  );
}


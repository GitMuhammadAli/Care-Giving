import { api } from './client';

export interface Family {
  id: string;
  name: string;
  createdAt: string;
  members?: FamilyMember[];
  careRecipients?: { id: string; fullName: string; preferredName?: string; photoUrl?: string }[];
  invitations?: FamilyInvitation[];
}

export interface FamilyMember {
  id: string;
  userId: string;
  familyId: string;
  role: 'ADMIN' | 'CAREGIVER' | 'VIEWER';
  joinedAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface FamilyInvitation {
  id: string;
  familyId: string;
  email: string;
  role: 'ADMIN' | 'CAREGIVER' | 'VIEWER';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  invitedById: string;
  createdAt: string;
  expiresAt: string;
}

export interface CreateFamilyInput {
  name: string;
}

export interface InviteMemberInput {
  email: string;
  role: 'ADMIN' | 'CAREGIVER' | 'VIEWER';
}

export const familyApi = {
  // Families
  list: async (): Promise<Family[]> => {
    return api.get<Family[]>('/families');
  },

  get: async (id: string): Promise<Family> => {
    return api.get<Family>(`/families/${id}`);
  },

  create: async (data: CreateFamilyInput): Promise<Family> => {
    return api.post<Family>('/families', data);
  },

  update: async (id: string, data: Partial<CreateFamilyInput>): Promise<Family> => {
    return api.patch<Family>(`/families/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/families/${id}`);
  },

  // Members
  getMembers: async (familyId: string): Promise<FamilyMember[]> => {
    return api.get<FamilyMember[]>(`/families/${familyId}/members`);
  },

  updateMemberRole: async (familyId: string, memberId: string, role: string): Promise<void> => {
    await api.patch(`/families/${familyId}/members/${memberId}/role`, { role });
  },

  removeMember: async (familyId: string, memberId: string): Promise<void> => {
    await api.delete(`/families/${familyId}/members/${memberId}`);
  },

  // Invitations
  invite: async (familyId: string, data: InviteMemberInput): Promise<FamilyInvitation> => {
    return api.post<FamilyInvitation>(`/families/${familyId}/invite`, data);
  },

  getPendingInvitations: async (familyId: string): Promise<FamilyInvitation[]> => {
    return api.get<FamilyInvitation[]>(`/families/${familyId}/invitations`);
  },

  cancelInvitation: async (familyId: string, invitationId: string): Promise<void> => {
    await api.delete(`/families/${familyId}/invitations/${invitationId}`);
  },

  resendInvitation: async (familyId: string, invitationId: string): Promise<void> => {
    await api.post(`/families/${familyId}/invitations/${invitationId}/resend`);
  },

  acceptInvitation: async (token: string): Promise<Family> => {
    return api.post<Family>(`/families/accept-invite/${token}`);
  },

  // Password Reset (Admin only)
  resetMemberPassword: async (familyId: string, userId: string): Promise<{ message: string }> => {
    return api.post<{ message: string }>(`/families/${familyId}/members/${userId}/reset-password`);
  },
};


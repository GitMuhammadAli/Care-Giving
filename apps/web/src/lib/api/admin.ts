import { api } from './client';

// Types
export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  status: string;
  systemRole: 'USER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
  emailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  avatarUrl?: string;
  familyCount?: number;
}

export interface AdminUserDetail extends AdminUser {
  timezone?: string;
  phoneVerified?: boolean;
  failedLoginAttempts?: number;
  lockedUntil?: string;
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string;
  familyMemberships: Array<{
    id: string;
    role: string;
    joinedAt: string;
    family: {
      id: string;
      name: string;
    };
  }>;
  _count?: {
    sessions: number;
    notifications: number;
    medicationLogs: number;
    timelineEntries: number;
  };
}

export interface AdminFamily {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  careRecipientCount: number;
  documentCount: number;
  admin?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminOverview {
  users: {
    total: number;
    active: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
    growthRate: number;
  };
  families: {
    total: number;
    pendingInvitations: number;
  };
  careRecipients: {
    total: number;
    activeMedications: number;
    upcomingAppointments: number;
    activeEmergencies: number;
  };
  timestamp: string;
}

export interface UserFilter {
  search?: string;
  status?: string;
  systemRole?: string;
  emailVerified?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FamilyFilter {
  search?: string;
  createdAfter?: string;
  createdBefore?: string;
  minMembers?: number;
  maxMembers?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuditLogFilter {
  userId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: string;
  user?: {
    id: string;
    email: string;
    fullName: string;
  };
}

// API functions
export const adminApi = {
  // Users
  getUsers: async (filter: UserFilter = {}): Promise<PaginatedResponse<AdminUser>> => {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });
    return api.get(`/admin/users?${params.toString()}`);
  },

  getUser: async (id: string): Promise<AdminUserDetail> => {
    return api.get(`/admin/users/${id}`);
  },

  createUser: async (data: {
    email: string;
    fullName: string;
    phone?: string;
    systemRole?: string;
    skipEmailVerification?: boolean;
  }) => {
    return api.post<{ user: AdminUser; tempPassword?: string; message: string }>(
      '/admin/users',
      data
    );
  },

  updateUser: async (id: string, data: Partial<AdminUser>) => {
    return api.patch<AdminUser>(`/admin/users/${id}`, data);
  },

  suspendUser: async (id: string, reason?: string) => {
    return api.post<{ message: string }>(`/admin/users/${id}/suspend`, { reason });
  },

  activateUser: async (id: string) => {
    return api.post<{ message: string }>(`/admin/users/${id}/activate`);
  },

  resetUserPassword: async (id: string) => {
    return api.post<{ message: string; resetToken?: string }>(
      `/admin/users/${id}/reset-password`
    );
  },

  deleteUser: async (id: string, reason?: string) => {
    return api.delete<{ message: string }>(`/admin/users/${id}`, { reason });
  },

  bulkUserAction: async (data: {
    userIds: string[];
    action: 'SUSPEND' | 'ACTIVATE' | 'DELETE' | 'RESET_PASSWORD';
    reason?: string;
  }) => {
    return api.post<{ affected: number; message: string }>(
      '/admin/users/bulk-action',
      data
    );
  },

  getUserActivity: async (id: string) => {
    return api.get<{
      auditLogs: AuditLog[];
      sessions: any[];
      recentNotifications: any[];
    }>(`/admin/users/${id}/activity`);
  },

  // Families
  getFamilies: async (filter: FamilyFilter = {}): Promise<PaginatedResponse<AdminFamily>> => {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });
    return api.get(`/admin/families?${params.toString()}`);
  },

  getFamily: async (id: string) => {
    return api.get<any>(`/admin/families/${id}`);
  },

  updateFamily: async (id: string, data: { name?: string }) => {
    return api.patch(`/admin/families/${id}`, data);
  },

  deleteFamily: async (id: string, reason?: string) => {
    return api.delete<{ message: string }>(`/admin/families/${id}`, { reason });
  },

  getFamilyMembers: async (id: string) => {
    return api.get<any[]>(`/admin/families/${id}/members`);
  },

  addFamilyMember: async (
    familyId: string,
    data: { userId: string; role: 'ADMIN' | 'CAREGIVER' | 'VIEWER' }
  ) => {
    return api.post(`/admin/families/${familyId}/members`, data);
  },

  removeFamilyMember: async (familyId: string, memberId: string) => {
    return api.delete<{ message: string }>(
      `/admin/families/${familyId}/members/${memberId}`
    );
  },

  transferOwnership: async (familyId: string, newOwnerId: string) => {
    return api.post<{ message: string }>(`/admin/families/${familyId}/transfer`, {
      newOwnerId,
    });
  },

  getFamilyActivity: async (id: string) => {
    return api.get<any>(`/admin/families/${id}/activity`);
  },

  // Analytics
  getOverview: async (): Promise<AdminOverview> => {
    return api.get('/admin/analytics/overview');
  },

  getUserMetrics: async (days: number = 30) => {
    return api.get<any>(`/admin/analytics/users?days=${days}`);
  },

  getFamilyMetrics: async (days: number = 30) => {
    return api.get<any>(`/admin/analytics/families?days=${days}`);
  },

  getUsageMetrics: async () => {
    return api.get<any>('/admin/analytics/usage');
  },

  // Audit
  getAuditLogs: async (
    filter: AuditLogFilter = {}
  ): Promise<PaginatedResponse<AuditLog>> => {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });
    return api.get(`/admin/audit/logs?${params.toString()}`);
  },

  getUserAuditTrail: async (userId: string): Promise<AuditLog[]> => {
    return api.get(`/admin/audit/user/${userId}`);
  },

  getSecurityEvents: async () => {
    return api.get<AuditLog[]>('/admin/audit/security-events');
  },

  getLoginAttempts: async (days: number = 7) => {
    return api.get<any>(`/admin/audit/login-attempts?days=${days}`);
  },

  getAdminActions: async () => {
    return api.get<AuditLog[]>('/admin/audit/admin-actions');
  },

  // System
  getSystemHealth: async () => {
    return api.get<any>('/admin/system/health');
  },

  getSystemStats: async () => {
    return api.get<any>('/admin/system/stats');
  },

  getResourceUsage: async () => {
    return api.get<any>('/admin/system/usage');
  },

  getUsageSummary: async () => {
    return api.get<any>('/admin/system/usage/summary');
  },
};


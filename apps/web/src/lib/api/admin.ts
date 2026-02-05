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

// Application Logs
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface ApplicationLog {
  id: string;
  level: LogLevel;
  message: string;
  service?: string;
  context?: string;
  requestId?: string;
  userId?: string;
  errorStack?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface LogFilter {
  level?: LogLevel;
  service?: string;
  userId?: string;
  requestId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface LogStats {
  total: number;
  byLevel: Record<LogLevel, number>;
  byService: Record<string, number>;
  timeRange: {
    start: string;
    end: string;
  };
}

export interface LogDashboard {
  summary: {
    last24Hours: LogStats;
    last7Days: LogStats;
  };
  recentErrors: ApplicationLog[];
  levels: LogLevel[];
  timestamp: string;
}

// Monitoring Types
export type EmailStatus = 'PENDING' | 'SENT' | 'FAILED';
export type AuthEvent = 
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET_SUCCESS'
  | 'EMAIL_VERIFICATION_SENT'
  | 'EMAIL_VERIFIED'
  | 'ACCOUNT_LOCKED'
  | 'SESSION_EXPIRED'
  | 'REGISTER';
export type CronStatus = 'STARTED' | 'COMPLETED' | 'FAILED';

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

export interface TimeSeriesData {
  data: TimeSeriesPoint[];
  total: number;
  interval: 'hour' | 'day';
}

export interface ResponseTimeStats {
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  timeSeries: TimeSeriesPoint[];
}

export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  template?: string;
  status: EmailStatus;
  provider: string;
  error?: string;
  sentAt?: string;
  createdAt: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface EmailLogFilter {
  status?: EmailStatus;
  provider?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  byProvider: Record<string, number>;
  byTemplate: Record<string, number>;
}

export interface AuthLog {
  id: string;
  event: AuthEvent;
  email: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface AuthLogFilter {
  event?: AuthEvent;
  email?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AuthStats {
  total: number;
  loginSuccess: number;
  loginFailed: number;
  passwordResets: number;
  registrations: number;
  byEvent: Record<string, number>;
  failedLoginsByEmail: Array<{ email: string; count: number }>;
}

export interface AuthTimeSeries {
  loginSuccess: TimeSeriesData;
  loginFailed: TimeSeriesData;
  registrations: TimeSeriesData;
}

export interface CronLog {
  id: string;
  jobName: string;
  status: CronStatus;
  duration?: number;
  itemsProcessed?: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, any>;
}

export interface CronLogFilter {
  jobName?: string;
  status?: CronStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CronStats {
  total: number;
  completed: number;
  failed: number;
  running: number;
  avgDuration: number;
  byJob: Array<{
    jobName: string;
    total: number;
    completed: number;
    failed: number;
    avgDuration: number;
  }>;
}

export interface CronTimeSeries {
  completed: TimeSeriesData;
  failed: TimeSeriesData;
  avgDuration: TimeSeriesPoint[];
}

export interface RealtimeStats {
  requestsLastMinute: number;
  errorsLastMinute: number;
  activeUsers: number;
  avgResponseTime: number;
  emailsSentToday: number;
  cronJobsRunning: number;
}

export interface MonitoringDashboard {
  requests: TimeSeriesData;
  errors: TimeSeriesData;
  responseTimes: ResponseTimeStats;
  emails: EmailStats;
  auth: AuthStats;
  cron: CronStats;
  realtime: RealtimeStats;
  timestamp: string;
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

  // Logs
  getLogs: async (filter: LogFilter = {}): Promise<PaginatedResponse<ApplicationLog>> => {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });
    return api.get(`/admin/logs?${params.toString()}`);
  },

  getLogStats: async (hours: number = 24): Promise<LogStats> => {
    return api.get(`/admin/logs/stats?hours=${hours}`);
  },

  getRecentErrors: async (limit: number = 10): Promise<ApplicationLog[]> => {
    return api.get(`/admin/logs/errors?limit=${limit}`);
  },

  getLogDashboard: async (): Promise<LogDashboard> => {
    return api.get('/admin/logs/dashboard');
  },

  getLogServices: async (): Promise<{ services: { name: string; count: number }[] }> => {
    return api.get('/admin/logs/services');
  },

  getLogLevels: async (): Promise<{ levels: LogLevel[] }> => {
    return api.get('/admin/logs/levels');
  },

  cleanupLogs: async (days: number = 30): Promise<{ message: string; deletedCount: number }> => {
    return api.delete(`/admin/logs/cleanup?days=${days}`);
  },

  // Monitoring
  getMonitoringDashboard: async (hours: number = 24): Promise<MonitoringDashboard> => {
    return api.get(`/admin/monitoring/dashboard?hours=${hours}`);
  },

  getRequestTimeSeries: async (hours: number = 24): Promise<TimeSeriesData> => {
    return api.get(`/admin/monitoring/requests/timeseries?hours=${hours}`);
  },

  getErrorTimeSeries: async (hours: number = 24): Promise<TimeSeriesData> => {
    return api.get(`/admin/monitoring/errors/timeseries?hours=${hours}`);
  },

  getResponseTimeStats: async (hours: number = 24): Promise<ResponseTimeStats> => {
    return api.get(`/admin/monitoring/response-times?hours=${hours}`);
  },

  getEmailLogs: async (filter: EmailLogFilter = {}): Promise<PaginatedResponse<EmailLog>> => {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });
    return api.get(`/admin/monitoring/emails?${params.toString()}`);
  },

  getEmailStats: async (hours: number = 24): Promise<EmailStats> => {
    return api.get(`/admin/monitoring/emails/stats?hours=${hours}`);
  },

  getEmailTimeSeries: async (hours: number = 24): Promise<{ sent: TimeSeriesData; failed: TimeSeriesData }> => {
    return api.get(`/admin/monitoring/emails/timeseries?hours=${hours}`);
  },

  getAuthLogs: async (filter: AuthLogFilter = {}): Promise<PaginatedResponse<AuthLog>> => {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });
    return api.get(`/admin/monitoring/auth?${params.toString()}`);
  },

  getAuthStats: async (hours: number = 24): Promise<AuthStats> => {
    return api.get(`/admin/monitoring/auth/stats?hours=${hours}`);
  },

  getAuthTimeSeries: async (hours: number = 24): Promise<AuthTimeSeries> => {
    return api.get(`/admin/monitoring/auth/timeseries?hours=${hours}`);
  },

  getCronLogs: async (filter: CronLogFilter = {}): Promise<PaginatedResponse<CronLog>> => {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });
    return api.get(`/admin/monitoring/cron?${params.toString()}`);
  },

  getCronStats: async (hours: number = 24): Promise<CronStats> => {
    return api.get(`/admin/monitoring/cron/stats?hours=${hours}`);
  },

  getCronTimeSeries: async (hours: number = 24): Promise<CronTimeSeries> => {
    return api.get(`/admin/monitoring/cron/timeseries?hours=${hours}`);
  },

  getCronJobNames: async (): Promise<{ jobNames: string[] }> => {
    return api.get('/admin/monitoring/cron/jobs');
  },

  getRealtimeStats: async (): Promise<RealtimeStats> => {
    return api.get('/admin/monitoring/realtime');
  },
};


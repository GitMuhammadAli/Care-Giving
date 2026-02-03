import { api } from './client';

export interface NotificationPreferences {
  emergencyAlerts: boolean; // Always true, cannot be disabled
  medicationReminders: boolean;
  appointmentReminders: boolean;
  shiftReminders: boolean;
  familyActivity: boolean;
  email: boolean;
  push: boolean;
  sms: boolean;
}

export const userApi = {
  /**
   * Get current user's notification preferences
   */
  getNotificationPreferences: async (): Promise<NotificationPreferences> => {
    return api.get('/user/preferences/notifications');
  },

  /**
   * Update notification preferences
   */
  updateNotificationPreferences: async (
    preferences: Partial<NotificationPreferences>
  ): Promise<{ success: boolean; message: string }> => {
    return api.patch('/user/preferences/notifications', preferences);
  },

  /**
   * Export user data (GDPR)
   */
  exportData: async () => {
    return api.get('/user/export');
  },

  /**
   * Delete user account (GDPR)
   */
  deleteAccount: async () => {
    return api.delete('/user/delete-account');
  },
};


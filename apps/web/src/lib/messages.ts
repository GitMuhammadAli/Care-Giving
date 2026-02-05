/**
 * Centralized Frontend Messages
 * All user-facing messages for toasts, alerts, and UI
 */

// ==================== AUTH MESSAGES ====================
export const AUTH_MESSAGES = {
  // Login
  LOGIN_SUCCESS: 'Welcome back!',
  LOGIN_FAILED: 'Login failed. Please check your credentials.',
  
  // Register
  REGISTER_SUCCESS: 'Account created! Please check your email to verify.',
  REGISTER_FAILED: 'Registration failed. Please try again.',
  
  // Logout
  LOGOUT_SUCCESS: 'You have been logged out.',
  
  // Password
  PASSWORD_RESET_SENT: 'If an account exists with this email, you will receive a reset link.',
  PASSWORD_RESET_SUCCESS: 'Password reset successfully! You can now log in.',
  PASSWORD_CHANGE_SUCCESS: 'Password changed successfully.',
  
  // Verification
  EMAIL_VERIFIED: 'Email verified successfully!',
  VERIFICATION_CODE_SENT: 'Verification code sent to your email.',
  VERIFICATION_CODE_RESENT: 'A new verification code has been sent.',
  
  // Session
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  
  // Errors
  ACCOUNT_EXISTS: 'An account with this email already exists.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  ACCOUNT_NOT_VERIFIED: 'Please verify your email before logging in.',
  TOO_MANY_ATTEMPTS: 'Too many attempts. Please try again later.',
} as const;

// ==================== FORM VALIDATION MESSAGES ====================
export const FORM_MESSAGES = {
  REQUIRED: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
  PASSWORD_MISMATCH: 'Passwords do not match',
  INVALID_PHONE: 'Please enter a valid phone number',
  INVALID_DATE: 'Please enter a valid date',
  DATE_IN_PAST: 'Date cannot be in the past',
  DATE_IN_FUTURE: 'Date cannot be in the future',
  MIN_LENGTH: (min: number) => `Must be at least ${min} characters`,
  MAX_LENGTH: (max: number) => `Must be no more than ${max} characters`,
} as const;

// ==================== MEDICATION MESSAGES ====================
export const MEDICATION_MESSAGES = {
  ADDED: 'Medication added successfully',
  UPDATED: 'Medication updated successfully',
  DELETED: 'Medication deleted',
  LOGGED: 'Medication logged successfully',
  SKIPPED: 'Medication marked as skipped',
  REFILL_ALERT: 'This medication needs a refill soon',
  NOT_FOUND: 'Medication not found',
} as const;

// ==================== APPOINTMENT MESSAGES ====================
export const APPOINTMENT_MESSAGES = {
  CREATED: 'Appointment scheduled successfully',
  UPDATED: 'Appointment updated',
  CANCELLED: 'Appointment cancelled',
  REMINDER_SET: 'Reminder set for this appointment',
  NOT_FOUND: 'Appointment not found',
} as const;

// ==================== FAMILY MESSAGES ====================
export const FAMILY_MESSAGES = {
  CREATED: 'Family created successfully',
  UPDATED: 'Family settings updated',
  DELETED: 'Family deleted',
  MEMBER_INVITED: 'Invitation sent successfully',
  MEMBER_REMOVED: 'Family member removed',
  MEMBER_ROLE_UPDATED: 'Member role updated',
  INVITATION_ACCEPTED: 'You have joined the family!',
  INVITATION_DECLINED: 'Invitation declined',
  INVITATION_EXPIRED: 'This invitation has expired',
  LEFT_FAMILY: 'You have left the family',
} as const;

// ==================== CARE RECIPIENT MESSAGES ====================
export const CARE_RECIPIENT_MESSAGES = {
  ADDED: 'Care recipient added successfully',
  UPDATED: 'Care recipient information updated',
  DELETED: 'Care recipient removed',
  PHOTO_UPDATED: 'Photo updated successfully',
} as const;

// ==================== DOCUMENT MESSAGES ====================
export const DOCUMENT_MESSAGES = {
  UPLOADED: 'Document uploaded successfully',
  DELETED: 'Document deleted',
  DOWNLOAD_STARTED: 'Download started',
  UPLOAD_FAILED: 'Failed to upload document. Please try again.',
  FILE_TOO_LARGE: 'File is too large. Maximum size is 10MB.',
  INVALID_FILE_TYPE: 'Invalid file type. Please upload a valid document.',
} as const;

// ==================== TIMELINE MESSAGES ====================
export const TIMELINE_MESSAGES = {
  ENTRY_ADDED: 'Entry added to timeline',
  ENTRY_UPDATED: 'Timeline entry updated',
  ENTRY_DELETED: 'Timeline entry deleted',
} as const;

// ==================== EMERGENCY MESSAGES ====================
export const EMERGENCY_MESSAGES = {
  ALERT_CREATED: 'Emergency alert sent to all family members',
  ALERT_RESOLVED: 'Emergency alert resolved',
  ALERT_ACKNOWLEDGED: 'Alert acknowledged',
} as const;

// ==================== SHIFT MESSAGES ====================
export const SHIFT_MESSAGES = {
  CREATED: 'Shift scheduled successfully',
  UPDATED: 'Shift updated',
  CANCELLED: 'Shift cancelled',
  CHECKED_IN: 'Checked in successfully',
  CHECKED_OUT: 'Checked out successfully',
  OVERLAP: 'This shift overlaps with an existing shift',
} as const;

// ==================== NOTIFICATION MESSAGES ====================
export const NOTIFICATION_MESSAGES = {
  ENABLED: 'Push notifications enabled',
  DISABLED: 'Push notifications disabled',
  PERMISSION_DENIED: 'Notification permission denied. Please enable in browser settings.',
  NOT_SUPPORTED: 'Push notifications are not supported in this browser',
  PREFERENCES_SAVED: 'Notification preferences saved',
} as const;

// ==================== GENERAL MESSAGES ====================
export const GENERAL_MESSAGES = {
  SAVED: 'Changes saved',
  DELETED: 'Deleted successfully',
  COPIED: 'Copied to clipboard',
  LOADING: 'Loading...',
  ERROR: 'Something went wrong. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  NOT_FOUND: 'The requested item was not found',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  FORBIDDEN: 'Access denied',
} as const;

// ==================== ADMIN MESSAGES ====================
export const ADMIN_MESSAGES = {
  USER_SUSPENDED: 'User has been suspended',
  USER_ACTIVATED: 'User has been activated',
  USER_DELETED: 'User has been deleted',
  FAMILY_DELETED: 'Family has been deleted',
  SETTINGS_SAVED: 'Settings saved successfully',
  BULK_ACTION_SUCCESS: (count: number, action: string) => 
    `${count} ${count === 1 ? 'user' : 'users'} ${action}`,
} as const;

// ==================== COMBINED EXPORT ====================
export const MESSAGES = {
  AUTH: AUTH_MESSAGES,
  FORM: FORM_MESSAGES,
  MEDICATION: MEDICATION_MESSAGES,
  APPOINTMENT: APPOINTMENT_MESSAGES,
  FAMILY: FAMILY_MESSAGES,
  CARE_RECIPIENT: CARE_RECIPIENT_MESSAGES,
  DOCUMENT: DOCUMENT_MESSAGES,
  TIMELINE: TIMELINE_MESSAGES,
  EMERGENCY: EMERGENCY_MESSAGES,
  SHIFT: SHIFT_MESSAGES,
  NOTIFICATION: NOTIFICATION_MESSAGES,
  GENERAL: GENERAL_MESSAGES,
  ADMIN: ADMIN_MESSAGES,
} as const;

export default MESSAGES;


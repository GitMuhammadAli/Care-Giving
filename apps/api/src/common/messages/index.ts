/**
 * Centralized Messages
 * All error and success messages for the API
 * This allows easy updates, translations, and consistency
 */

// ==================== AUTH MESSAGES ====================
export const AUTH_MESSAGES = {
  // Registration
  REGISTER_SUCCESS: 'Registration successful. Please check your email (or API console in dev mode) to verify your account.',
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists. Please sign in or use a different email.',
  
  // Login
  INVALID_CREDENTIALS: 'Invalid email or password. Please check your credentials and try again.',
  INVALID_PASSWORD: 'Invalid email or password. Please check your credentials and try again.',
  EMAIL_NOT_VERIFIED: 'Please verify your email address before logging in.',
  ACCOUNT_NOT_ACTIVE: 'Your account is not active. Please contact support.',
  ACCOUNT_LOCKED: 'Your account has been temporarily locked. Please try again later.',
  
  // Logout
  LOGOUT_SUCCESS: 'Logged out successfully',
  LOGOUT_ALL_SUCCESS: 'Logged out from all devices',
  
  // Password Reset
  PASSWORD_RESET_EMAIL_SENT: 'If an account exists with this email, you will receive a password reset link shortly.',
  PASSWORD_RESET_SUCCESS: 'Password reset successfully',
  PASSWORD_CHANGE_SUCCESS: 'Password changed successfully',
  CURRENT_PASSWORD_INCORRECT: 'Current password is incorrect',
  RESET_TOKEN_INVALID: 'This password reset link has expired or is invalid. Please request a new one.',
  
  // Email Verification
  EMAIL_VERIFIED_SUCCESS: 'Email verified successfully',
  EMAIL_ALREADY_VERIFIED: 'Email already verified',
  VERIFICATION_CODE_SENT: 'Verification code sent successfully',
  VERIFICATION_CODE_SENT_IF_EXISTS: 'If the email exists, a verification code has been sent',
  VERIFICATION_CODE_NOT_FOUND: 'No verification code found. Please request a new one.',
  VERIFICATION_CODE_EXPIRED: 'Verification code has expired. Please request a new one.',
  VERIFICATION_CODE_INVALID: 'Invalid verification code',
  
  // Token
  REFRESH_TOKEN_REQUIRED: 'Refresh token required',
  INVALID_REFRESH_TOKEN: 'Invalid refresh token',
  
  // User Status
  USER_NOT_FOUND: 'User not found',
  USER_NOT_FOUND_OR_INACTIVE: 'User not found or inactive',
  
  // Onboarding
  ONBOARDING_COMPLETED: 'Onboarding completed successfully',
  
  // Cache
  CACHE_INVALIDATED: 'Cache invalidated successfully',
} as const;

// ==================== USER MESSAGES ====================
export const USER_MESSAGES = {
  NOT_FOUND: 'User not found',
  PREFERENCES_UPDATED: 'Notification preferences updated',
  DATA_EXPORTED: 'Your data has been exported successfully',
  ACCOUNT_DELETED: 'Your account and associated data have been deleted',
} as const;

// ==================== FAMILY MESSAGES ====================
export const FAMILY_MESSAGES = {
  NOT_FOUND: 'Family not found or access denied',
  DELETED_SUCCESS: 'Family deleted successfully',
  
  // Members
  MEMBER_NOT_FOUND: 'Member not found in this family',
  MEMBER_REMOVED: 'Member removed from family',
  MEMBER_ALREADY_EXISTS: 'User is already a member of this family',
  
  // Invitations
  INVITATION_NOT_FOUND: 'Invitation not found',
  
  // Ownership
  OWNERSHIP_TRANSFERRED: 'Family ownership transferred successfully',
  NEW_OWNER_MUST_BE_MEMBER: 'New owner must be an existing family member',
} as const;

// ==================== CARE RECIPIENT MESSAGES ====================
export const CARE_RECIPIENT_MESSAGES = {
  NOT_FOUND: 'Care recipient not found',
  DOCTOR_NOT_FOUND: 'Doctor not found',
  EMERGENCY_CONTACT_NOT_FOUND: 'Emergency contact not found',
} as const;

// ==================== MEDICATION MESSAGES ====================
export const MEDICATION_MESSAGES = {
  NOT_FOUND: 'Medication not found',
} as const;

// ==================== APPOINTMENT MESSAGES ====================
export const APPOINTMENT_MESSAGES = {
  NOT_FOUND: 'Appointment not found',
  OCCURRENCE_REMOVED: 'Occurrence removed from series',
  NO_APPOINTMENTS_IN_SERIES: 'No appointments found in series',
  NO_ACTIVE_APPOINTMENTS_IN_SERIES: 'No active appointments found in series',
  TRANSPORT_NOT_FOUND: 'Transport assignment not found',
} as const;

// ==================== DOCUMENT MESSAGES ====================
export const DOCUMENT_MESSAGES = {
  NOT_FOUND: 'Document not found',
  FILE_REQUIRED: 'File is required',
  FILE_NOT_AVAILABLE: 'Document file not available. The upload may still be processing or failed.',
} as const;

// ==================== TIMELINE MESSAGES ====================
export const TIMELINE_MESSAGES = {
  ENTRY_NOT_FOUND: 'Timeline entry not found',
} as const;

// ==================== EMERGENCY MESSAGES ====================
export const EMERGENCY_MESSAGES = {
  ALERT_NOT_FOUND: 'Alert not found',
} as const;

// ==================== SHIFT MESSAGES ====================
export const SHIFT_MESSAGES = {
  NOT_FOUND: 'Shift not found',
  OVERLAPS_EXISTING: 'Shift overlaps with an existing shift',
} as const;

// ==================== ADMIN MESSAGES ====================
export const ADMIN_MESSAGES = {
  // Users
  USER_NOT_FOUND: 'User not found',
  USER_EMAIL_EXISTS: 'User with this email already exists',
  USER_EMAIL_IN_USE: 'Email already in use',
  USER_ALREADY_SUSPENDED: 'User is already suspended',
  USER_ALREADY_ACTIVE: 'User is already active',
  USER_SUSPENDED: 'User suspended successfully',
  USER_ACTIVATED: 'User activated successfully',
  USER_DELETED: 'User deleted successfully',
  CANNOT_SUSPEND_SUPER_ADMIN: 'Cannot suspend a super admin',
  CANNOT_DELETE_SUPER_ADMIN: 'Cannot delete a super admin',
  PASSWORD_RESET_INITIATED: 'Password reset initiated',
  
  // Bulk Actions
  NO_ELIGIBLE_USERS: 'No eligible users for this action',
  USERS_SUSPENDED: 'Users suspended',
  USERS_ACTIVATED: 'Users activated',
  USERS_DELETED: 'Users deleted',
  FAMILIES_DELETED: 'Families deleted',
  INVALID_ACTION: 'Invalid action',
  
  // Validation
  HOURS_VALIDATION: 'Hours must be between 1 and 720',
  DAYS_VALIDATION: 'Days must be between 1 and 365',
} as const;

// ==================== CHAT MESSAGES ====================
export const CHAT_MESSAGES = {
  NOT_CONFIGURED: 'Stream Chat not configured',
  MEMBER_ADDED: 'Member added to channel',
} as const;

// ==================== VALIDATION MESSAGES ====================
export const VALIDATION_MESSAGES = {
  VALUE_TOO_LONG: 'The provided value is too long for this field.',
  INVALID_ID_FORMAT: 'Invalid ID format provided.',
  RECORD_NOT_FOUND: 'The requested record was not found.',
} as const;

// ==================== EMAIL MESSAGES ====================
export const EMAIL_MESSAGES = {
  LIMIT_REACHED: 'Daily email limit reached. Please try again tomorrow.',
} as const;

// ==================== COMBINED EXPORT ====================
export const MESSAGES = {
  AUTH: AUTH_MESSAGES,
  USER: USER_MESSAGES,
  FAMILY: FAMILY_MESSAGES,
  CARE_RECIPIENT: CARE_RECIPIENT_MESSAGES,
  MEDICATION: MEDICATION_MESSAGES,
  APPOINTMENT: APPOINTMENT_MESSAGES,
  DOCUMENT: DOCUMENT_MESSAGES,
  TIMELINE: TIMELINE_MESSAGES,
  EMERGENCY: EMERGENCY_MESSAGES,
  SHIFT: SHIFT_MESSAGES,
  ADMIN: ADMIN_MESSAGES,
  CHAT: CHAT_MESSAGES,
  VALIDATION: VALIDATION_MESSAGES,
  EMAIL: EMAIL_MESSAGES,
} as const;

// Type exports for type-safe usage
export type AuthMessage = typeof AUTH_MESSAGES[keyof typeof AUTH_MESSAGES];
export type UserMessage = typeof USER_MESSAGES[keyof typeof USER_MESSAGES];
export type FamilyMessage = typeof FAMILY_MESSAGES[keyof typeof FAMILY_MESSAGES];
export type AdminMessage = typeof ADMIN_MESSAGES[keyof typeof ADMIN_MESSAGES];


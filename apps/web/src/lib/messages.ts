/**
 * Centralized Frontend Messages
 * All user-facing toast / error / success strings live here.
 * Import what you need:  import { AUTH, FORM } from '@/lib/messages';
 */

export const AUTH = {
  // Login
  LOGIN_SUCCESS: 'Welcome back! Redirecting...',
  LOGIN_FAILED: 'Invalid email or password',
  ACCOUNT_NOT_VERIFIED: 'Please verify your email address before logging in.',

  // Register
  REGISTER_SUCCESS: 'Account created! Please check your email to verify your account.',
  REGISTER_FAILED: 'Failed to create account. Please try again.',
  PASSWORD_REQUIREMENTS: 'Please meet all password requirements',
  ACCEPT_TERMS: 'Please agree to the Terms of Service and Privacy Policy',

  // Forgot Password
  RESET_LINK_SENT: 'Request received! Check your inbox.',
  RATE_LIMITED: 'Too many requests. Please wait a few minutes before trying again.',

  // Reset Password
  RESET_SUCCESS: 'Password reset successful!',
  RESET_FAILED: 'Failed to reset password. The link may have expired.',
  RESET_TOKEN_MISSING: 'Reset token is missing',
  RESET_TOKEN_INVALID: 'Invalid or expired reset link',
  PASSWORDS_NO_MATCH: 'Passwords do not match',
  PASSWORD_WEAK: 'Password does not meet requirements',

  // Verify Email
  VERIFY_SUCCESS: 'Email verified successfully! Redirecting...',
  VERIFY_FAILED: 'Failed to verify email. Please try again.',
  VERIFY_INVALID_CODE: 'Invalid verification code. Please try again.',
  VERIFY_ENTER_DIGITS: 'Please enter all 6 digits',
  CODE_SENT: 'Verification code sent! Check your email.',
  CODE_SEND_FAILED: 'Failed to send code. Please try again.',
  CODE_RESEND_FAILED: 'Failed to resend code. Please try again.',

  // Session
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
} as const;

export const FORM = {
  INVALID_EMAIL: 'Please enter a valid email address',
} as const;

export const GENERAL = {
  SOMETHING_WRONG: 'Something went wrong. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
} as const;

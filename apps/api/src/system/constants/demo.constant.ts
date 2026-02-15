/**
 * Demo User Constants
 * ===================
 * The demo user can log in and explore all features but cannot modify
 * their own account (email, password, profile, deactivation).
 *
 * Read/create operations are ALLOWED so visitors can test Smart Entry,
 * Ask AI, and timeline creation.  Destructive operations on the demo
 * account itself are blocked.
 */

/** Email address of the demo user — matches the seed-demo.ts script. */
export const DEMO_USER_EMAIL = 'demo@carecircle.com';

/** Quick check: is this user the demo account? */
export function isDemoUser(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.toLowerCase() === DEMO_USER_EMAIL;
}

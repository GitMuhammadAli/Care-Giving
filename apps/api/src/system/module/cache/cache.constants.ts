/**
 * Cache key patterns and TTL configurations
 *
 * Key naming convention: {domain}:{entity}:{id}
 * Examples:
 *   - user:profile:uuid-123
 *   - family:abc-123
 *   - recipient:medications:uuid-456
 */

// Cache key generators
export const CACHE_KEYS = {
  // User-related keys
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  USER_FAMILIES: (userId: string) => `user:families:${userId}`,
  USER_SESSIONS: (userId: string) => `user:sessions:${userId}`,
  USER_NOTIFICATIONS_UNREAD: (userId: string) => `user:notifications:unread:${userId}`,

  // Family-related keys
  FAMILY: (familyId: string) => `family:${familyId}`,
  FAMILY_MEMBERS: (familyId: string) => `family:members:${familyId}`,
  FAMILY_INVITATION: (token: string) => `invitation:${token}`,

  // Care recipient-related keys
  CARE_RECIPIENT: (id: string) => `recipient:${id}`,
  CARE_RECIPIENTS: (familyId: string) => `family:recipients:${familyId}`,
  CARE_RECIPIENT_DOCTORS: (id: string) => `recipient:doctors:${id}`,
  CARE_RECIPIENT_CONTACTS: (id: string) => `recipient:contacts:${id}`,

  // Medication-related keys
  MEDICATION: (id: string) => `medication:${id}`,
  MEDICATIONS: (careRecipientId: string) => `recipient:medications:${careRecipientId}`,
  MEDICATION_SCHEDULE: (careRecipientId: string, date: string) =>
    `recipient:schedule:${careRecipientId}:${date}`,

  // Appointment-related keys
  APPOINTMENT: (id: string) => `appointment:${id}`,
  APPOINTMENTS_UPCOMING: (careRecipientId: string) =>
    `recipient:appointments:upcoming:${careRecipientId}`,
  APPOINTMENTS_DAY: (careRecipientId: string, date: string) =>
    `recipient:appointments:${careRecipientId}:${date}`,

  // Shift-related keys
  SHIFT: (id: string) => `shift:${id}`,
  SHIFT_CURRENT: (careRecipientId: string) => `recipient:shifts:current:${careRecipientId}`,
  SHIFTS_UPCOMING: (careRecipientId: string) => `recipient:shifts:upcoming:${careRecipientId}`,
  SHIFTS_DAY: (careRecipientId: string, date: string) =>
    `recipient:shifts:${careRecipientId}:${date}`,

  // Emergency-related keys
  EMERGENCY_INFO: (careRecipientId: string) => `recipient:emergency:${careRecipientId}`,
  EMERGENCY_ALERTS_ACTIVE: (careRecipientId: string) =>
    `recipient:alerts:active:${careRecipientId}`,

  // Timeline/Vitals keys
  TIMELINE_RECENT: (careRecipientId: string) => `recipient:timeline:recent:${careRecipientId}`,
  VITALS_RECENT: (careRecipientId: string, days: number) =>
    `recipient:vitals:${careRecipientId}:${days}`,

  // Chat keys
  CHAT_CHANNELS: (userId: string) => `chat:channels:${userId}`,
} as const;

// TTL values in seconds
export const CACHE_TTL = {
  // User data - moderate change frequency
  USER_PROFILE: 300,           // 5 minutes
  USER_FAMILIES: 300,          // 5 minutes
  USER_SESSIONS: 60,           // 1 minute (real-time nature)
  USER_NOTIFICATIONS: 30,      // 30 seconds

  // Family data - moderate change frequency
  FAMILY: 300,                 // 5 minutes
  FAMILY_MEMBERS: 300,         // 5 minutes
  FAMILY_INVITATION: 1800,     // 30 minutes (rarely changes)

  // Care recipient - moderate change frequency
  CARE_RECIPIENT: 300,         // 5 minutes
  CARE_RECIPIENTS: 300,        // 5 minutes
  DOCTORS: 1800,               // 30 minutes (rarely changes)
  EMERGENCY_CONTACTS: 1800,    // 30 minutes (rarely changes)

  // Medications - changes more frequently (logging)
  MEDICATION: 120,             // 2 minutes
  MEDICATIONS: 120,            // 2 minutes
  MEDICATION_SCHEDULE: 120,    // 2 minutes

  // Appointments - moderate change frequency
  APPOINTMENT: 180,            // 3 minutes
  APPOINTMENTS_UPCOMING: 180,  // 3 minutes
  APPOINTMENTS_DAY: 300,       // 5 minutes

  // Shifts - real-time nature
  SHIFT: 60,                   // 1 minute
  SHIFT_CURRENT: 60,           // 1 minute (real-time)
  SHIFTS_UPCOMING: 120,        // 2 minutes
  SHIFTS_DAY: 180,             // 3 minutes

  // Emergency - critical but stable
  EMERGENCY_INFO: 600,         // 10 minutes (must be accurate but stable)
  EMERGENCY_ALERTS: 60,        // 1 minute

  // Timeline/Vitals - frequent reads
  TIMELINE: 120,               // 2 minutes
  VITALS: 120,                 // 2 minutes

  // Chat
  CHAT_CHANNELS: 300,          // 5 minutes
} as const;

// Pattern for bulk invalidation
export const CACHE_PATTERNS = {
  USER_ALL: (userId: string) => `user:*:${userId}`,
  FAMILY_ALL: (familyId: string) => `family:*:${familyId}`,
  RECIPIENT_ALL: (careRecipientId: string) => `recipient:*:${careRecipientId}`,
} as const;

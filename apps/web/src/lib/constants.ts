/**
 * Centralized Enums & Constants
 *
 * All Prisma enum values, label maps, and form-option arrays live here.
 * Keep the values in sync with `packages/database/prisma/schema.prisma` and
 * any custom backend DTOs.
 *
 * Import what you need:
 *   import { ROLE_LABELS, MEDICATION_FREQUENCIES } from '@/lib/constants';
 */

// ───────────────────────────────────────────
// 1. Family Roles  (Prisma: FamilyRole)
// ───────────────────────────────────────────

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  CAREGIVER: 'Caregiver',
  VIEWER: 'Viewer',
} as const;

/** Rich options used by invite-member & onboarding forms. */
export const FAMILY_ROLE_OPTIONS = [
  {
    value: 'ADMIN',
    label: 'Admin',
    description: 'Can manage family, invite members, edit all data',
    icon: '👑',
  },
  {
    value: 'CAREGIVER',
    label: 'Caregiver',
    description: 'Can log medications, add notes, manage schedule',
    icon: '💪',
  },
  {
    value: 'VIEWER',
    label: 'Viewer',
    description: 'Can view all information but not make changes',
    icon: '👁️',
  },
] as const;

export const DEFAULT_FAMILY_ROLE = 'CAREGIVER';

// ───────────────────────────────────────────
// 2. Blood Type  (Backend DTO: BloodType)
// ───────────────────────────────────────────

// Backend BloodType enum values use display strings: 'A+', 'A-', etc.
export const BLOOD_TYPE_LABELS: Record<string, string> = {
  'A+': 'A+',
  'A-': 'A-',
  'B+': 'B+',
  'B-': 'B-',
  'AB+': 'AB+',
  'AB-': 'AB-',
  'O+': 'O+',
  'O-': 'O-',
  'Unknown': 'Unknown',
  // Also map SCREAMING_SNAKE keys for any data already stored that way
  A_POSITIVE: 'A+',
  A_NEGATIVE: 'A-',
  B_POSITIVE: 'B+',
  B_NEGATIVE: 'B-',
  AB_POSITIVE: 'AB+',
  AB_NEGATIVE: 'AB-',
  O_POSITIVE: 'O+',
  O_NEGATIVE: 'O-',
  UNKNOWN: 'Unknown',
} as const;

/** Options for blood-type <select>. Values match the backend BloodType enum. */
export const BLOOD_TYPE_OPTIONS = [
  { value: '', label: 'Unknown' },
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
] as const;

// ───────────────────────────────────────────
// 3. Medication Form  (Prisma: MedicationForm)
// ───────────────────────────────────────────

export const MEDICATION_FORM_LABELS: Record<string, string> = {
  TABLET: 'Tablet',
  CAPSULE: 'Capsule',
  LIQUID: 'Liquid',
  INJECTION: 'Injection',
  PATCH: 'Patch',
  CREAM: 'Cream',
  INHALER: 'Inhaler',
  DROPS: 'Drops',
  OTHER: 'Other',
} as const;

export const MEDICATION_FORM_OPTIONS = [
  { value: 'TABLET', label: 'Tablet' },
  { value: 'CAPSULE', label: 'Capsule' },
  { value: 'LIQUID', label: 'Liquid' },
  { value: 'INJECTION', label: 'Injection' },
  { value: 'PATCH', label: 'Patch' },
  { value: 'CREAM', label: 'Cream' },
  { value: 'INHALER', label: 'Inhaler' },
  { value: 'DROPS', label: 'Drops' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const DEFAULT_MEDICATION_FORM = 'TABLET';

// ───────────────────────────────────────────
// 4. Medication Frequency  (Prisma: MedicationFrequency)
// ───────────────────────────────────────────

export const MEDICATION_FREQUENCY_LABELS: Record<string, string> = {
  DAILY: 'Daily',
  TWICE_DAILY: 'Twice daily',
  THREE_TIMES_DAILY: '3x daily',
  FOUR_TIMES_DAILY: '4x daily',
  WEEKLY: 'Weekly',
  AS_NEEDED: 'As needed',
  OTHER: 'Other',
} as const;

export const MEDICATION_FREQUENCY_OPTIONS = [
  { value: 'DAILY', label: 'Once daily' },
  { value: 'TWICE_DAILY', label: 'Twice daily' },
  { value: 'THREE_TIMES_DAILY', label: 'Three times daily' },
  { value: 'FOUR_TIMES_DAILY', label: 'Four times daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'AS_NEEDED', label: 'As needed' },
  { value: 'OTHER', label: 'Other / Custom' },
] as const;

export const DEFAULT_MEDICATION_FREQUENCY = 'DAILY';

// ───────────────────────────────────────────
// 5. Medication Log Status  (Prisma: MedicationLogStatus)
// ───────────────────────────────────────────

export const MEDICATION_LOG_STATUS_LABELS: Record<string, string> = {
  GIVEN: 'Given',
  SKIPPED: 'Skipped',
  MISSED: 'Missed',
  PENDING: 'Pending',
} as const;

// ───────────────────────────────────────────
// 6. Appointment Type  (Prisma: AppointmentType)
// ───────────────────────────────────────────

export const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  DOCTOR_VISIT: 'Doctor Visit',
  PHYSICAL_THERAPY: 'Physical Therapy',
  LAB_WORK: 'Lab Work',
  IMAGING: 'Imaging',
  SPECIALIST: 'Specialist',
  HOME_HEALTH: 'Home Health',
  OTHER: 'Other',
} as const;

export const APPOINTMENT_TYPE_OPTIONS = [
  { value: 'DOCTOR_VISIT', label: 'Doctor Visit' },
  { value: 'SPECIALIST', label: 'Specialist' },
  { value: 'LAB_WORK', label: 'Lab Work' },
  { value: 'IMAGING', label: 'Imaging' },
  { value: 'PHYSICAL_THERAPY', label: 'Physical Therapy' },
  { value: 'HOME_HEALTH', label: 'Home Health' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const DEFAULT_APPOINTMENT_TYPE = 'DOCTOR_VISIT';

/** Colour config used by the calendar page. */
export const APPOINTMENT_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  DOCTOR_VISIT: { bg: 'bg-info-light', text: 'text-info' },
  PHYSICAL_THERAPY: { bg: 'bg-success-light', text: 'text-success' },
  LAB_WORK: { bg: 'bg-warning-light', text: 'text-warning' },
  IMAGING: { bg: 'bg-chart-purple/10', text: 'text-chart-purple' },
  SPECIALIST: { bg: 'bg-accent-primary-light', text: 'text-accent-primary' },
  HOME_HEALTH: { bg: 'bg-accent-warm-light', text: 'text-accent-warm' },
  OTHER: { bg: 'bg-bg-muted', text: 'text-text-secondary' },
} as const;

// ───────────────────────────────────────────
// 7. Appointment Status  (Prisma: AppointmentStatus)
// ───────────────────────────────────────────

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
} as const;

// ───────────────────────────────────────────
// 8. Recurrence Pattern  (Backend DTO enum)
// ───────────────────────────────────────────

// Backend RecurrencePattern enum uses lowercase values
export const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
] as const;

export const DEFAULT_RECURRENCE = 'none';

// ───────────────────────────────────────────
// 9. Document Type  (Prisma: DocumentType)
// ───────────────────────────────────────────

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  INSURANCE_CARD: 'Insurance Card',
  PHOTO_ID: 'ID / Card',
  MEDICAL_RECORD: 'Medical Record',
  LAB_RESULT: 'Lab Result',
  PRESCRIPTION: 'Prescription',
  POWER_OF_ATTORNEY: 'Power of Attorney',
  LIVING_WILL: 'Living Will',
  DNR: 'DNR',
  OTHER: 'Other',
} as const;

/**
 * Options for document upload. Each entry maps to both the Prisma
 * `DocumentType` (value) and the backend `DocumentCategory` (category).
 */
export const DOCUMENT_TYPE_OPTIONS = [
  { value: 'MEDICAL_RECORD', label: 'Medical Record', category: 'medical' },
  { value: 'LAB_RESULT', label: 'Lab Result', category: 'medical' },
  { value: 'PRESCRIPTION', label: 'Prescription', category: 'medical' },
  { value: 'INSURANCE_CARD', label: 'Insurance Card', category: 'insurance' },
  { value: 'PHOTO_ID', label: 'ID / Card', category: 'identification' },
  { value: 'POWER_OF_ATTORNEY', label: 'Power of Attorney', category: 'legal' },
  { value: 'LIVING_WILL', label: 'Living Will', category: 'legal' },
  { value: 'DNR', label: 'DNR', category: 'legal' },
  { value: 'OTHER', label: 'Other', category: 'other' },
] as const;

export const DEFAULT_DOCUMENT_TYPE = 'MEDICAL_RECORD';

// ───────────────────────────────────────────
// 10. Timeline Entry Type  (Prisma: TimelineType)
// ───────────────────────────────────────────

export const TIMELINE_TYPE_LABELS: Record<string, string> = {
  NOTE: 'Note',
  VITALS: 'Vitals',
  SYMPTOM: 'Symptom',
  INCIDENT: 'Incident',
  MOOD: 'Mood',
  MEAL: 'Meal',
  ACTIVITY: 'Activity',
  SLEEP: 'Sleep',
  BATHROOM: 'Bathroom',
  MEDICATION_CHANGE: 'Medication Change',
  APPOINTMENT_SUMMARY: 'Appointment Summary',
  OTHER: 'Other',
} as const;

/** Options for the timeline add-entry form (includes emoji + colour). */
export const TIMELINE_TYPE_OPTIONS = [
  { value: 'NOTE', label: '📝 Note', color: 'text-text-secondary' },
  { value: 'VITALS', label: '❤️ Vitals', color: 'text-accent-warm' },
  { value: 'INCIDENT', label: '⚠️ Incident', color: 'text-warning' },
  { value: 'MOOD', label: '😊 Mood', color: 'text-info' },
  { value: 'MEAL', label: '🍽️ Meal', color: 'text-accent-warm' },
  { value: 'ACTIVITY', label: '🚶 Activity', color: 'text-success' },
  { value: 'SLEEP', label: '😴 Sleep', color: 'text-info' },
  { value: 'SYMPTOM', label: '🩺 Symptom', color: 'text-error' },
  { value: 'BATHROOM', label: '🚻 Bathroom', color: 'text-text-secondary' },
  { value: 'OTHER', label: '📋 Other', color: 'text-text-secondary' },
] as const;

export const DEFAULT_TIMELINE_TYPE = 'NOTE';

export const MOOD_OPTIONS = [
  '😊 Great',
  '🙂 Good',
  '😐 Okay',
  '😔 Low',
  '😢 Sad',
  '😤 Frustrated',
] as const;

// ───────────────────────────────────────────
// 11. Severity  (Prisma: Severity)
// ───────────────────────────────────────────

export const SEVERITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
} as const;

// ───────────────────────────────────────────
// 12. Emergency Type  (Prisma: EmergencyType)
// ───────────────────────────────────────────

export const EMERGENCY_TYPE_LABELS: Record<string, string> = {
  FALL: 'Fall',
  MEDICAL: 'Medical Emergency',
  MISSING: 'Missing',
  HOSPITALIZATION: 'Going to Hospital',
  OTHER: 'Other',
} as const;

// ───────────────────────────────────────────
// 13. Shift Status  (Prisma: ShiftStatus)
// ───────────────────────────────────────────

export const SHIFT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
} as const;

// ───────────────────────────────────────────
// 14. File Upload Limits
// ───────────────────────────────────────────

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_FILE_TYPES: string[] = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// ───────────────────────────────────────────
// 15. Skip Reasons  (medication log)
// ───────────────────────────────────────────

export const MEDICATION_SKIP_REASONS = [
  'Refused to take',
  'Felt nauseous',
  'Sleeping',
  'Not available',
  'Doctor advised to skip',
  'Ran out of medication',
  'Other',
] as const;

// ───────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────

/** Generic helper – look up a label or fall back to the raw value. */
export function getLabel(map: Record<string, string>, value: string | undefined | null): string {
  if (!value) return '';
  return map[value] ?? value;
}

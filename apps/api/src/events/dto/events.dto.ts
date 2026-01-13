/**
 * Event DTOs (Data Transfer Objects)
 * 
 * All events follow CloudEvents specification for interoperability:
 * https://cloudevents.io/
 */

// ============================================================================
// BASE EVENT STRUCTURE
// ============================================================================

export interface BaseEvent<T = unknown> {
  /** Unique event ID (UUID) */
  id: string;
  
  /** Event type (e.g., 'medication.logged') */
  type: string;
  
  /** Event source (service that produced the event) */
  source: string;
  
  /** ISO 8601 timestamp */
  timestamp: string;
  
  /** CloudEvents spec version */
  specVersion: '1.0';
  
  /** Event payload */
  data: T;
  
  /** Correlation ID for tracing */
  correlationId?: string;
  
  /** User who triggered the event */
  causedBy?: string;
  
  /** Family ID for multi-tenancy */
  familyId?: string;
  
  /** Care recipient ID */
  careRecipientId?: string;
}

// ============================================================================
// MEDICATION EVENTS
// ============================================================================

export interface MedicationCreatedPayload {
  medicationId: string;
  name: string;
  dosage: string;
  frequency: string;
  careRecipientId: string;
  createdById: string;
}

export interface MedicationLoggedPayload {
  medicationId: string;
  medicationName: string;
  status: 'GIVEN' | 'SKIPPED' | 'MISSED';
  loggedById: string;
  loggedByName: string;
  careRecipientId: string;
  careRecipientName: string;
  scheduledTime: string;
  actualTime: string;
  notes?: string;
  skipReason?: string;
}

export interface MedicationDuePayload {
  medicationId: string;
  medicationName: string;
  dosage: string;
  careRecipientId: string;
  careRecipientName: string;
  scheduledTime: string;
  instructions?: string;
}

export interface MedicationRefillPayload {
  medicationId: string;
  medicationName: string;
  currentSupply: number;
  daysRemaining: number;
  careRecipientId: string;
  careRecipientName: string;
}

// ============================================================================
// APPOINTMENT EVENTS
// ============================================================================

export interface AppointmentCreatedPayload {
  appointmentId: string;
  title: string;
  datetime: string;
  location?: string;
  provider?: string;
  careRecipientId: string;
  createdById: string;
}

export interface AppointmentReminderPayload {
  appointmentId: string;
  title: string;
  datetime: string;
  location?: string;
  provider?: string;
  careRecipientId: string;
  careRecipientName: string;
  reminderType: '1_day' | '1_hour' | '15_min';
}

export interface AppointmentCancelledPayload {
  appointmentId: string;
  title: string;
  originalDatetime: string;
  careRecipientId: string;
  cancelledById: string;
  reason?: string;
}

// ============================================================================
// EMERGENCY EVENTS
// ============================================================================

export interface EmergencyAlertCreatedPayload {
  alertId: string;
  type: 'FALL' | 'MEDICAL' | 'HOSPITALIZATION' | 'MISSING' | 'OTHER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  careRecipientId: string;
  careRecipientName: string;
  description?: string;
  location?: string;
  createdById: string;
  createdByName: string;
  familyMemberIds: string[];
}

export interface EmergencyAlertResolvedPayload {
  alertId: string;
  careRecipientId: string;
  resolvedById: string;
  resolution: string;
  duration: number; // minutes
}

// ============================================================================
// SHIFT EVENTS
// ============================================================================

export interface ShiftStartedPayload {
  shiftId: string;
  caregiverId: string;
  caregiverName: string;
  careRecipientId: string;
  careRecipientName: string;
  startTime: string;
  scheduledEndTime?: string;
  notes?: string;
}

export interface ShiftEndedPayload {
  shiftId: string;
  caregiverId: string;
  caregiverName: string;
  careRecipientId: string;
  endTime: string;
  duration: number; // minutes
  handoffNotes?: string;
}

export interface ShiftHandoffPayload {
  outgoingShiftId: string;
  outgoingCaregiver: { id: string; name: string };
  incomingCaregiver: { id: string; name: string };
  careRecipientId: string;
  careRecipientName: string;
  handoffNotes: string;
  pendingTasks?: string[];
}

// ============================================================================
// FAMILY EVENTS
// ============================================================================

export interface FamilyMemberInvitedPayload {
  inviteId: string;
  email: string;
  role: string;
  invitedById: string;
  invitedByName: string;
  familyId: string;
}

export interface FamilyMemberJoinedPayload {
  userId: string;
  userName: string;
  email: string;
  role: string;
  familyId: string;
}

// ============================================================================
// TIMELINE EVENTS
// ============================================================================

export interface TimelineEntryCreatedPayload {
  entryId: string;
  type: string;
  title: string;
  description?: string;
  careRecipientId: string;
  createdById: string;
  createdByName: string;
  vitals?: Record<string, number>;
  mood?: number;
}

// ============================================================================
// NOTIFICATION EVENTS
// ============================================================================

export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  url?: string;
  data?: Record<string, unknown>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface EmailNotificationPayload {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
  priority: 'low' | 'normal' | 'high';
}

export interface SmsNotificationPayload {
  to: string;
  message: string;
  priority: 'normal' | 'urgent';
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type MedicationCreatedEvent = BaseEvent<MedicationCreatedPayload>;
export type MedicationLoggedEvent = BaseEvent<MedicationLoggedPayload>;
export type MedicationDueEvent = BaseEvent<MedicationDuePayload>;
export type MedicationRefillEvent = BaseEvent<MedicationRefillPayload>;

export type AppointmentCreatedEvent = BaseEvent<AppointmentCreatedPayload>;
export type AppointmentReminderEvent = BaseEvent<AppointmentReminderPayload>;
export type AppointmentCancelledEvent = BaseEvent<AppointmentCancelledPayload>;

export type EmergencyAlertCreatedEvent = BaseEvent<EmergencyAlertCreatedPayload>;
export type EmergencyAlertResolvedEvent = BaseEvent<EmergencyAlertResolvedPayload>;

export type ShiftStartedEvent = BaseEvent<ShiftStartedPayload>;
export type ShiftEndedEvent = BaseEvent<ShiftEndedPayload>;
export type ShiftHandoffEvent = BaseEvent<ShiftHandoffPayload>;

export type FamilyMemberInvitedEvent = BaseEvent<FamilyMemberInvitedPayload>;
export type FamilyMemberJoinedEvent = BaseEvent<FamilyMemberJoinedPayload>;

export type TimelineEntryCreatedEvent = BaseEvent<TimelineEntryCreatedPayload>;

export type PushNotificationEvent = BaseEvent<PushNotificationPayload>;
export type EmailNotificationEvent = BaseEvent<EmailNotificationPayload>;
export type SmsNotificationEvent = BaseEvent<SmsNotificationPayload>;


/**
 * Event-Driven Architecture Constants
 * 
 * This file defines all exchanges, queues, and routing keys
 * used in the RabbitMQ message broker system.
 */

// ============================================================================
// EXCHANGES - Logical groupings for events
// ============================================================================

export const EXCHANGES = {
  /**
   * Domain Events Exchange
   * - Type: Topic (allows pattern-based routing)
   * - Used for: All domain events (medications, appointments, etc.)
   */
  DOMAIN_EVENTS: 'carecircle.domain.events',

  /**
   * Notifications Exchange
   * - Type: Direct (exact routing key match)
   * - Used for: Push notifications, emails, SMS
   */
  NOTIFICATIONS: 'carecircle.notifications',

  /**
   * Dead Letter Exchange
   * - Type: Direct
   * - Used for: Failed messages that need manual inspection
   */
  DEAD_LETTER: 'carecircle.dlx',

  /**
   * Audit Exchange
   * - Type: Fanout (broadcasts to all bound queues)
   * - Used for: Audit logging, analytics
   */
  AUDIT: 'carecircle.audit',
} as const;

// ============================================================================
// ROUTING KEYS - Event identifiers
// ============================================================================

export const ROUTING_KEYS = {
  // Medication events
  MEDICATION_CREATED: 'medication.created',
  MEDICATION_UPDATED: 'medication.updated',
  MEDICATION_DELETED: 'medication.deleted',
  MEDICATION_LOGGED: 'medication.logged',
  MEDICATION_MISSED: 'medication.missed',
  MEDICATION_DUE: 'medication.due',
  MEDICATION_REFILL_NEEDED: 'medication.refill_needed',

  // Appointment events
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_UPDATED: 'appointment.updated',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  APPOINTMENT_REMINDER: 'appointment.reminder',

  // Emergency events
  EMERGENCY_ALERT_CREATED: 'emergency.alert.created',
  EMERGENCY_ALERT_RESOLVED: 'emergency.alert.resolved',

  // Caregiver events
  SHIFT_STARTED: 'shift.started',
  SHIFT_ENDED: 'shift.ended',
  SHIFT_HANDOFF: 'shift.handoff',

  // Family events
  FAMILY_MEMBER_INVITED: 'family.member.invited',
  FAMILY_MEMBER_JOINED: 'family.member.joined',
  FAMILY_MEMBER_LEFT: 'family.member.left',

  // Care recipient events
  CARE_RECIPIENT_CREATED: 'care_recipient.created',
  CARE_RECIPIENT_UPDATED: 'care_recipient.updated',

  // Timeline events
  TIMELINE_ENTRY_CREATED: 'timeline.entry.created',

  // Document events
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_DELETED: 'document.deleted',

  // Notification events (for notification exchange)
  NOTIFY_PUSH: 'notify.push',
  NOTIFY_EMAIL: 'notify.email',
  NOTIFY_SMS: 'notify.sms',
} as const;

// ============================================================================
// QUEUES - Message destinations
// ============================================================================

export const QUEUES = {
  // Real-time update queues
  WEBSOCKET_UPDATES: 'carecircle.websocket.updates',
  
  // Notification queues
  PUSH_NOTIFICATIONS: 'carecircle.notifications.push',
  EMAIL_NOTIFICATIONS: 'carecircle.notifications.email',
  SMS_NOTIFICATIONS: 'carecircle.notifications.sms',

  // Processing queues
  MEDICATION_PROCESSOR: 'carecircle.processor.medications',
  APPOINTMENT_PROCESSOR: 'carecircle.processor.appointments',
  EMERGENCY_PROCESSOR: 'carecircle.processor.emergency',

  // Audit queues
  AUDIT_LOG: 'carecircle.audit.log',
  ANALYTICS: 'carecircle.audit.analytics',

  // Dead letter queues
  DLQ_NOTIFICATIONS: 'carecircle.dlq.notifications',
  DLQ_PROCESSING: 'carecircle.dlq.processing',
} as const;

// ============================================================================
// TYPES
// ============================================================================

export type Exchange = (typeof EXCHANGES)[keyof typeof EXCHANGES];
export type RoutingKey = (typeof ROUTING_KEYS)[keyof typeof ROUTING_KEYS];
export type Queue = (typeof QUEUES)[keyof typeof QUEUES];


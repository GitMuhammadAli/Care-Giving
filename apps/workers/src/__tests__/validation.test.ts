/**
 * Job Payload Validation Tests
 */

import { 
  validateJobPayload,
  MedicationReminderJobSchema,
  AppointmentReminderJobSchema,
  ShiftReminderJobSchema,
  NotificationJobSchema,
  RefillAlertJobSchema,
} from '@carecircle/config';

describe('Job Payload Validation', () => {
  describe('MedicationReminderJobSchema', () => {
    const validPayload = {
      medicationId: '123e4567-e89b-12d3-a456-426614174000',
      careRecipientId: '123e4567-e89b-12d3-a456-426614174001',
      scheduledTime: '2024-01-15T09:00:00.000Z',
      medicationName: 'Aspirin',
      dosage: '100mg',
      minutesBefore: 30,
    };

    it('should validate a correct payload', () => {
      const result = validateJobPayload(
        MedicationReminderJobSchema,
        validPayload,
        'MedicationReminderJob'
      );
      expect(result).toEqual(validPayload);
    });

    it('should reject invalid UUID', () => {
      expect(() => {
        validateJobPayload(
          MedicationReminderJobSchema,
          { ...validPayload, medicationId: 'invalid-uuid' },
          'MedicationReminderJob'
        );
      }).toThrow('Invalid MedicationReminderJob payload');
    });

    it('should reject invalid datetime', () => {
      expect(() => {
        validateJobPayload(
          MedicationReminderJobSchema,
          { ...validPayload, scheduledTime: 'not-a-date' },
          'MedicationReminderJob'
        );
      }).toThrow('Invalid MedicationReminderJob payload');
    });

    it('should reject missing required fields', () => {
      expect(() => {
        validateJobPayload(
          MedicationReminderJobSchema,
          { medicationId: validPayload.medicationId },
          'MedicationReminderJob'
        );
      }).toThrow();
    });

    it('should reject empty medication name', () => {
      expect(() => {
        validateJobPayload(
          MedicationReminderJobSchema,
          { ...validPayload, medicationName: '' },
          'MedicationReminderJob'
        );
      }).toThrow();
    });
  });

  describe('AppointmentReminderJobSchema', () => {
    const validPayload = {
      appointmentId: '123e4567-e89b-12d3-a456-426614174000',
      careRecipientId: '123e4567-e89b-12d3-a456-426614174001',
      appointmentTime: '2024-01-15T09:00:00.000Z',
      title: 'Doctor Visit',
      minutesBefore: 60,
    };

    it('should validate a correct payload', () => {
      const result = validateJobPayload(
        AppointmentReminderJobSchema,
        validPayload,
        'AppointmentReminderJob'
      );
      expect(result).toEqual(validPayload);
    });

    it('should allow optional location', () => {
      const withLocation = { ...validPayload, location: '123 Main St' };
      const result = validateJobPayload(
        AppointmentReminderJobSchema,
        withLocation,
        'AppointmentReminderJob'
      );
      expect(result.location).toBe('123 Main St');
    });

    it('should reject empty title', () => {
      expect(() => {
        validateJobPayload(
          AppointmentReminderJobSchema,
          { ...validPayload, title: '' },
          'AppointmentReminderJob'
        );
      }).toThrow();
    });
  });

  describe('ShiftReminderJobSchema', () => {
    const validPayload = {
      shiftId: '123e4567-e89b-12d3-a456-426614174000',
      careRecipientId: '123e4567-e89b-12d3-a456-426614174001',
      caregiverId: '123e4567-e89b-12d3-a456-426614174002',
      startTime: '2024-01-15T09:00:00.000Z',
      minutesBefore: 15,
    };

    it('should validate a correct payload', () => {
      const result = validateJobPayload(
        ShiftReminderJobSchema,
        validPayload,
        'ShiftReminderJob'
      );
      expect(result).toEqual(validPayload);
    });

    it('should reject negative minutesBefore', () => {
      expect(() => {
        validateJobPayload(
          ShiftReminderJobSchema,
          { ...validPayload, minutesBefore: -5 },
          'ShiftReminderJob'
        );
      }).toThrow();
    });
  });

  describe('NotificationJobSchema', () => {
    const validPayload = {
      type: 'PUSH' as const,
      userId: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test Notification',
      body: 'This is a test',
    };

    it('should validate a correct payload', () => {
      const result = validateJobPayload(
        NotificationJobSchema,
        validPayload,
        'NotificationJob'
      );
      expect(result.type).toBe('PUSH');
      expect(result.priority).toBe('normal'); // Default value
    });

    it('should accept all notification types', () => {
      const types = ['PUSH', 'IN_APP', 'SMS', 'EMAIL'] as const;
      types.forEach((type) => {
        const result = validateJobPayload(
          NotificationJobSchema,
          { ...validPayload, type },
          'NotificationJob'
        );
        expect(result.type).toBe(type);
      });
    });

    it('should reject invalid notification type', () => {
      expect(() => {
        validateJobPayload(
          NotificationJobSchema,
          { ...validPayload, type: 'INVALID' },
          'NotificationJob'
        );
      }).toThrow();
    });

    it('should enforce title max length', () => {
      expect(() => {
        validateJobPayload(
          NotificationJobSchema,
          { ...validPayload, title: 'a'.repeat(101) },
          'NotificationJob'
        );
      }).toThrow();
    });

    it('should enforce body max length', () => {
      expect(() => {
        validateJobPayload(
          NotificationJobSchema,
          { ...validPayload, body: 'a'.repeat(501) },
          'NotificationJob'
        );
      }).toThrow();
    });
  });

  describe('RefillAlertJobSchema', () => {
    const validPayload = {
      medicationId: '123e4567-e89b-12d3-a456-426614174000',
      medicationName: 'Aspirin',
      currentSupply: 5,
      refillAt: 10,
      careRecipientId: '123e4567-e89b-12d3-a456-426614174001',
      careRecipientName: 'John Doe',
      familyMemberUserIds: [
        '123e4567-e89b-12d3-a456-426614174002',
        '123e4567-e89b-12d3-a456-426614174003',
      ],
    };

    it('should validate a correct payload', () => {
      const result = validateJobPayload(
        RefillAlertJobSchema,
        validPayload,
        'RefillAlertJob'
      );
      expect(result).toEqual(validPayload);
    });

    it('should reject negative supply values', () => {
      expect(() => {
        validateJobPayload(
          RefillAlertJobSchema,
          { ...validPayload, currentSupply: -1 },
          'RefillAlertJob'
        );
      }).toThrow();
    });

    it('should accept empty family member array', () => {
      const result = validateJobPayload(
        RefillAlertJobSchema,
        { ...validPayload, familyMemberUserIds: [] },
        'RefillAlertJob'
      );
      expect(result.familyMemberUserIds).toEqual([]);
    });
  });
});

describe('Web Push Configuration', () => {
  // Web Push config is validated via environment variables
  // These tests verify the schema structure
  
  it('should export isWebPushConfigured function', async () => {
    const { isWebPushConfigured } = await import('@carecircle/config');
    expect(typeof isWebPushConfigured).toBe('function');
  });

  it('should export getWebPushConfig function', async () => {
    const { getWebPushConfig } = await import('@carecircle/config');
    expect(typeof getWebPushConfig).toBe('function');
  });
});


import { api } from './client';
import { Doctor, EmergencyContact } from './care-recipients';
import { Medication } from './medications';

export interface EmergencyInfo {
  careRecipient: {
    id: string;
    firstName: string;
    lastName: string;
    preferredName?: string;
    dateOfBirth: string;
    bloodType?: string;
    allergies: string[];
    medicalConditions: string[];
    photoUrl?: string;
  };
  doctors: Doctor[];
  medications: Medication[];
  emergencyContacts: EmergencyContact[];
  criticalDocuments: {
    id: string;
    name: string;
    type: string;
    signedUrl?: string;
  }[];
  preferredHospital?: {
    name: string;
    address: string;
    phone: string;
  };
  insurance?: {
    provider: string;
    policyNumber: string;
    groupNumber?: string;
  };
}

export interface EmergencyAlert {
  id: string;
  careRecipientId: string;
  triggeredById: string;
  type: 'FALL' | 'MEDICAL' | 'HOSPITALIZATION' | 'MISSING' | 'OTHER';
  status: 'ACTIVE' | 'RESOLVED';
  location?: string;
  description?: string;
  createdAt: string;
  resolvedAt?: string;
  triggeredBy: {
    id: string;
    fullName: string;
  };
}

export interface CreateEmergencyAlertInput {
  type: 'FALL' | 'MEDICAL' | 'HOSPITALIZATION' | 'MISSING' | 'OTHER';
  location?: string;
  description?: string;
}

export const emergencyApi = {
  // Get complete emergency info for offline caching
  getEmergencyInfo: async (familyId: string, careRecipientId: string): Promise<EmergencyInfo> => {
    return api.get<EmergencyInfo>(`/families/${familyId}/emergency/${careRecipientId}/info`);
  },

  // Create an emergency alert
  triggerAlert: async (
    familyId: string,
    careRecipientId: string,
    data: CreateEmergencyAlertInput
  ): Promise<EmergencyAlert> => {
    return api.post<EmergencyAlert>(`/families/${familyId}/emergency/alert`, {
      ...data,
      careRecipientId,
    });
  },

  // Get all alerts for a family
  getAlerts: async (familyId: string, limit: number = 20): Promise<EmergencyAlert[]> => {
    return api.get<EmergencyAlert[]>(`/families/${familyId}/emergency/alerts?limit=${limit}`);
  },

  // Get active alerts for a family
  getActiveAlerts: async (familyId: string): Promise<EmergencyAlert[]> => {
    return api.get<EmergencyAlert[]>(`/families/${familyId}/emergency/alerts/active`);
  },

  // Get a specific alert
  getAlert: async (familyId: string, alertId: string): Promise<EmergencyAlert> => {
    return api.get<EmergencyAlert>(`/families/${familyId}/emergency/alerts/${alertId}`);
  },

  // Acknowledge an alert
  acknowledgeAlert: async (familyId: string, alertId: string): Promise<EmergencyAlert> => {
    return api.post<EmergencyAlert>(`/families/${familyId}/emergency/alerts/${alertId}/acknowledge`);
  },

  // Resolve an alert
  resolveAlert: async (
    familyId: string,
    alertId: string,
    resolutionNotes?: string
  ): Promise<EmergencyAlert> => {
    return api.post<EmergencyAlert>(`/families/${familyId}/emergency/alerts/${alertId}/resolve`, {
      resolutionNotes,
    });
  },

  // Cancel an alert (only by the person who triggered it)
  cancelAlert: async (familyId: string, alertId: string): Promise<EmergencyAlert> => {
    return api.patch<EmergencyAlert>(`/families/${familyId}/emergency/alerts/${alertId}/cancel`);
  },
};


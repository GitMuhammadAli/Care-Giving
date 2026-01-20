import { api } from './client';
import { Doctor, EmergencyContact } from './care-recipients';
import { Medication } from './medications';

export interface EmergencyInfo {
  // Basic Info (matches backend response)
  name: string;
  preferredName?: string;
  dateOfBirth?: string;
  bloodType?: string;
  allergies: string[];
  conditions: string[];

  // Medications (formatted for ER)
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    instructions?: string;
  }[];

  // Contacts
  emergencyContacts: EmergencyContact[];
  familyMembers: {
    name: string;
    phone?: string;
    role: string;
  }[];

  // Medical Providers
  doctors: {
    name: string;
    specialty: string;
    phone: string;
    isPrimary?: boolean;
  }[];

  // Hospital & Insurance
  primaryHospital?: string;
  hospitalAddress?: string;
  insuranceProvider?: string;
  insurancePolicyNo?: string;

  // Documents
  criticalDocuments: {
    id: string;
    name: string;
    type: string;
    url?: string;
  }[];
}

export interface EmergencyAlert {
  id: string;
  careRecipientId: string;
  createdById: string;
  type: 'FALL' | 'MEDICAL' | 'HOSPITALIZATION' | 'MISSING' | 'OTHER';
  title: string;
  description: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  location?: string;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolvedById?: string;
  resolutionNotes?: string;
  createdBy: {
    id: string;
    fullName: string;
  };
  acknowledgedBy?: {
    id: string;
    fullName: string;
  };
}

export interface CreateEmergencyAlertInput {
  type: 'FALL' | 'MEDICAL' | 'HOSPITALIZATION' | 'MISSING' | 'OTHER';
  title: string;
  description: string;
  location?: string;
}

export const emergencyApi = {
  // Get complete emergency info for offline caching
  getEmergencyInfo: async (careRecipientId: string): Promise<EmergencyInfo> => {
    return api.get<EmergencyInfo>(`/care-recipients/${careRecipientId}/emergency/info`);
  },

  // Create an emergency alert
  triggerAlert: async (
    careRecipientId: string,
    data: CreateEmergencyAlertInput
  ): Promise<EmergencyAlert> => {
    return api.post<EmergencyAlert>(`/care-recipients/${careRecipientId}/emergency/alerts`, data);
  },

  // Get active alerts for a care recipient
  getActiveAlerts: async (careRecipientId: string): Promise<EmergencyAlert[]> => {
    return api.get<EmergencyAlert[]>(`/care-recipients/${careRecipientId}/emergency/alerts`);
  },

  // Get alert history for a care recipient
  getAlertHistory: async (careRecipientId: string, limit: number = 20): Promise<EmergencyAlert[]> => {
    return api.get<EmergencyAlert[]>(`/care-recipients/${careRecipientId}/emergency/alerts/history?limit=${limit}`);
  },

  // Acknowledge an alert
  acknowledgeAlert: async (careRecipientId: string, alertId: string): Promise<EmergencyAlert> => {
    return api.post<EmergencyAlert>(`/care-recipients/${careRecipientId}/emergency/alerts/${alertId}/acknowledge`);
  },

  // Resolve an alert
  resolveAlert: async (
    careRecipientId: string,
    alertId: string,
    resolutionNotes?: string
  ): Promise<EmergencyAlert> => {
    return api.post<EmergencyAlert>(`/care-recipients/${careRecipientId}/emergency/alerts/${alertId}/resolve`, {
      resolutionNotes,
    });
  },
};


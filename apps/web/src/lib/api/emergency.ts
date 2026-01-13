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
  getEmergencyInfo: async (careRecipientId: string): Promise<EmergencyInfo> => {
    return api.get<EmergencyInfo>(`/care-recipients/${careRecipientId}/emergency`);
  },

  triggerAlert: async (careRecipientId: string, data: CreateEmergencyAlertInput): Promise<EmergencyAlert> => {
    return api.post<EmergencyAlert>(`/care-recipients/${careRecipientId}/emergency/alert`, data);
  },

  getActiveAlerts: async (careRecipientId: string): Promise<EmergencyAlert[]> => {
    return api.get<EmergencyAlert[]>(`/care-recipients/${careRecipientId}/emergency/alerts`);
  },

  resolveAlert: async (alertId: string, notes?: string): Promise<void> => {
    await api.patch(`/emergency/alerts/${alertId}/resolve`, { notes });
  },
};


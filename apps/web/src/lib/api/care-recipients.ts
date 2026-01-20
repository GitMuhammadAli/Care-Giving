import { api } from './client';

export interface CareRecipient {
  id: string;
  familyId: string;
  fullName: string;
  preferredName?: string;
  dateOfBirth?: string;
  bloodType?: string;
  allergies: string[];
  conditions: string[];
  notes?: string;
  photoUrl?: string;
  // Hospital & Insurance info
  primaryHospital?: string;
  hospitalAddress?: string;
  insuranceProvider?: string;
  insurancePolicyNo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  fax?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary: boolean;
}

export interface CreateCareRecipientInput {
  fullName: string;
  preferredName?: string;
  dateOfBirth?: string;
  bloodType?: string;
  allergies?: string[];
  conditions?: string[];
  notes?: string;
  photoUrl?: string;
  primaryHospital?: string;
  hospitalAddress?: string;
  insuranceProvider?: string;
  insurancePolicyNo?: string;
}

export const careRecipientsApi = {
  list: async (familyId: string): Promise<CareRecipient[]> => {
    return api.get<CareRecipient[]>(`/families/${familyId}/care-recipients`);
  },

  get: async (id: string): Promise<CareRecipient> => {
    return api.get<CareRecipient>(`/care-recipients/${id}`);
  },

  create: async (familyId: string, data: CreateCareRecipientInput): Promise<CareRecipient> => {
    return api.post<CareRecipient>(`/families/${familyId}/care-recipients`, data);
  },

  update: async (id: string, data: Partial<CreateCareRecipientInput>): Promise<CareRecipient> => {
    return api.patch<CareRecipient>(`/care-recipients/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/care-recipients/${id}`);
  },

  // Doctors
  getDoctors: async (careRecipientId: string): Promise<Doctor[]> => {
    return api.get<Doctor[]>(`/care-recipients/${careRecipientId}/doctors`);
  },

  addDoctor: async (careRecipientId: string, data: Omit<Doctor, 'id'>): Promise<Doctor> => {
    return api.post<Doctor>(`/care-recipients/${careRecipientId}/doctors`, data);
  },

  // Emergency Contacts
  getEmergencyContacts: async (careRecipientId: string): Promise<EmergencyContact[]> => {
    return api.get<EmergencyContact[]>(`/care-recipients/${careRecipientId}/emergency-contacts`);
  },

  addEmergencyContact: async (
    careRecipientId: string,
    data: Omit<EmergencyContact, 'id'>
  ): Promise<EmergencyContact> => {
    return api.post<EmergencyContact>(`/care-recipients/${careRecipientId}/emergency-contacts`, data);
  },
};


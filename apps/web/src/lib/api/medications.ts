import { api } from './client';

export interface Medication {
  id: string;
  careRecipientId: string;
  name: string;
  dosage: string;
  form: string;
  frequency: string;
  scheduledTimes: string[];
  instructions?: string;
  prescribedBy?: string;
  pharmacy?: string;
  pharmacyPhone?: string;
  currentSupply?: number;
  refillAt?: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MedicationScheduleItem {
  medication: Medication;
  scheduledTime: string;
  time: string;
  status: 'PENDING' | 'GIVEN' | 'SKIPPED' | 'MISSED';
  logId?: string;
  givenTime?: string;
  givenBy?: {
    id: string;
    fullName: string;
  };
  skipReason?: string;
}

export interface CreateMedicationInput {
  name: string;
  genericName?: string;
  dosage: string;
  form: string;
  frequency: string;
  timesPerDay?: number;
  scheduledTimes?: string[];
  instructions?: string;
  prescribedBy?: string;
  pharmacy?: string;
  pharmacyPhone?: string;
  currentSupply?: number;
  refillAt?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface LogMedicationInput {
  status: 'GIVEN' | 'SKIPPED';
  scheduledTime: string;
  skipReason?: string;
  notes?: string;
}

export const medicationsApi = {
  list: async (careRecipientId: string): Promise<Medication[]> => {
    return api.get<Medication[]>(`/care-recipients/${careRecipientId}/medications`);
  },

  get: async (careRecipientId: string, id: string): Promise<Medication> => {
    return api.get<Medication>(`/care-recipients/${careRecipientId}/medications/${id}`);
  },

  create: async (careRecipientId: string, data: CreateMedicationInput): Promise<Medication> => {
    return api.post<Medication>(`/care-recipients/${careRecipientId}/medications`, data);
  },

  update: async (careRecipientId: string, id: string, data: Partial<CreateMedicationInput>): Promise<Medication> => {
    return api.patch<Medication>(`/care-recipients/${careRecipientId}/medications/${id}`, data);
  },

  delete: async (careRecipientId: string, id: string): Promise<void> => {
    await api.delete(`/care-recipients/${careRecipientId}/medications/${id}`);
  },

  // Schedule
  getTodaySchedule: async (careRecipientId: string, date?: string): Promise<MedicationScheduleItem[]> => {
    const params = date ? `?date=${date}` : '';
    return api.get<MedicationScheduleItem[]>(`/care-recipients/${careRecipientId}/medications/schedule/today${params}`);
  },

  // Logging
  log: async (medicationId: string, data: LogMedicationInput): Promise<void> => {
    await api.post(`/medications/${medicationId}/log`, data);
  },
};


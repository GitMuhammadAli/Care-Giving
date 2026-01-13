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
  currentSupply?: number;
  refillAlertThreshold?: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
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
  dosage: string;
  form: string;
  frequency: string;
  scheduledTimes: string[];
  instructions?: string;
  prescribedBy?: string;
  pharmacy?: string;
  currentSupply?: number;
  refillAlertThreshold?: number;
  startDate?: string;
  endDate?: string;
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

  get: async (id: string): Promise<Medication> => {
    return api.get<Medication>(`/medications/${id}`);
  },

  create: async (careRecipientId: string, data: CreateMedicationInput): Promise<Medication> => {
    return api.post<Medication>(`/care-recipients/${careRecipientId}/medications`, data);
  },

  update: async (id: string, data: Partial<CreateMedicationInput>): Promise<Medication> => {
    return api.patch<Medication>(`/medications/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/medications/${id}`);
  },

  // Schedule
  getTodaySchedule: async (careRecipientId: string, date?: string): Promise<MedicationScheduleItem[]> => {
    const params = date ? `?date=${date}` : '';
    return api.get<MedicationScheduleItem[]>(`/care-recipients/${careRecipientId}/medications/today${params}`);
  },

  // Logging
  log: async (medicationId: string, data: LogMedicationInput): Promise<void> => {
    await api.post(`/medications/${medicationId}/log`, data);
  },

  // Refill alerts
  getLowSupply: async (careRecipientId: string): Promise<Medication[]> => {
    return api.get<Medication[]>(`/care-recipients/${careRecipientId}/medications/low-supply`);
  },

  updateSupply: async (id: string, supply: number): Promise<void> => {
    await api.patch(`/medications/${id}/supply`, { currentSupply: supply });
  },
};


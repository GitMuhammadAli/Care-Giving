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

/** Raw shape returned by the API's schedule/today endpoint. */
interface RawScheduleResponse {
  medication: Medication;
  scheduledTimes: string[];
  logs: Array<{
    id: string;
    status: string;
    scheduledTime: string;
    givenAt?: string;
    givenBy?: { id: string; fullName: string };
    skipReason?: string;
  }>;
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

  // Schedule — flattens the API response into individual schedule items per time slot
  getTodaySchedule: async (careRecipientId: string, date?: string): Promise<MedicationScheduleItem[]> => {
    const params = date ? `?date=${date}` : '';
    const raw = await api.get<RawScheduleResponse[] | MedicationScheduleItem[]>(
      `/care-recipients/${careRecipientId}/medications/schedule/today${params}`,
    );

    // If the response is already flattened (has `time` on items), return as-is
    if (raw.length === 0) return [];
    if ('time' in raw[0] && typeof (raw[0] as any).time === 'string') {
      return raw as MedicationScheduleItem[];
    }

    // Otherwise flatten: expand each medication × scheduledTimes into individual items
    const items: MedicationScheduleItem[] = [];
    for (const entry of raw as RawScheduleResponse[]) {
      const times = entry.scheduledTimes || entry.medication?.scheduledTimes || [];
      for (const time of times) {
        const matchingLog = entry.logs?.find((l) => {
          if (!l.scheduledTime) return false;
          const logTime = new Date(l.scheduledTime);
          const h = logTime.getUTCHours().toString().padStart(2, '0');
          const m = logTime.getUTCMinutes().toString().padStart(2, '0');
          return `${h}:${m}` === time;
        });

        items.push({
          medication: entry.medication,
          scheduledTime: time,
          time,
          status: (matchingLog?.status as MedicationScheduleItem['status']) || 'PENDING',
          logId: matchingLog?.id,
          givenTime: matchingLog?.givenAt,
          givenBy: matchingLog?.givenBy,
          skipReason: matchingLog?.skipReason,
        });
      }
    }
    return items;
  },

  // Logging
  log: async (medicationId: string, data: LogMedicationInput): Promise<void> => {
    await api.post(`/medications/${medicationId}/log`, data);
  },
};


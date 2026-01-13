import { api } from './client';

export interface TimelineEntry {
  id: string;
  careRecipientId: string;
  createdById: string;
  type: string;
  title: string;
  description?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  vitals?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    oxygenLevel?: number;
    bloodSugar?: number;
    weight?: number;
  };
  occurredAt: string;
  createdAt: string;
  createdBy: {
    id: string;
    fullName: string;
  };
}

export interface CreateTimelineEntryInput {
  type: string;
  title: string;
  description?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  vitals?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    oxygenLevel?: number;
    bloodSugar?: number;
    weight?: number;
  };
  occurredAt?: string;
}

export const timelineApi = {
  list: async (
    careRecipientId: string,
    options?: { type?: string; limit?: number; offset?: number }
  ): Promise<TimelineEntry[]> => {
    const params = new URLSearchParams();
    if (options?.type) params.set('type', options.type);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<TimelineEntry[]>(`/care-recipients/${careRecipientId}/timeline${query}`);
  },

  getVitalsHistory: async (careRecipientId: string, days?: number): Promise<TimelineEntry[]> => {
    const params = days ? `?days=${days}` : '';
    return api.get<TimelineEntry[]>(`/care-recipients/${careRecipientId}/timeline/vitals${params}`);
  },

  getIncidents: async (careRecipientId: string): Promise<TimelineEntry[]> => {
    return api.get<TimelineEntry[]>(`/care-recipients/${careRecipientId}/timeline/incidents`);
  },

  create: async (careRecipientId: string, data: CreateTimelineEntryInput): Promise<TimelineEntry> => {
    return api.post<TimelineEntry>(`/care-recipients/${careRecipientId}/timeline`, data);
  },

  update: async (id: string, data: Partial<CreateTimelineEntryInput>): Promise<TimelineEntry> => {
    return api.patch<TimelineEntry>(`/timeline/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/timeline/${id}`);
  },
};


import { api } from './client';

export interface Appointment {
  id: string;
  careRecipientId: string;
  title: string;
  type: string;
  startTime: string;
  endTime?: string;
  location?: string;
  address?: string;
  notes?: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  recurrence?: string;
  reminderMinutes: number[];
  createdAt: string;
  transportAssignment?: {
    id: string;
    assignedTo: {
      id: string;
      fullName: string;
    };
    notes?: string;
  };
}

export interface CreateAppointmentInput {
  title: string;
  type: string;
  startTime: string;
  endTime?: string;
  location?: string;
  address?: string;
  notes?: string;
  recurrence?: string;
  reminderMinutes?: number[];
}

export interface AssignTransportInput {
  assignedToId: string;
  notes?: string;
}

export const appointmentsApi = {
  list: async (careRecipientId: string): Promise<Appointment[]> => {
    return api.get<Appointment[]>(`/care-recipients/${careRecipientId}/appointments`);
  },

  getUpcoming: async (careRecipientId: string, days?: number): Promise<Appointment[]> => {
    const params = days ? `?days=${days}` : '';
    return api.get<Appointment[]>(`/care-recipients/${careRecipientId}/appointments/upcoming${params}`);
  },

  getForDay: async (careRecipientId: string, date: string): Promise<Appointment[]> => {
    return api.get<Appointment[]>(`/care-recipients/${careRecipientId}/appointments/day?date=${date}`);
  },

  get: async (id: string): Promise<Appointment> => {
    return api.get<Appointment>(`/appointments/${id}`);
  },

  create: async (careRecipientId: string, data: CreateAppointmentInput): Promise<Appointment> => {
    return api.post<Appointment>(`/care-recipients/${careRecipientId}/appointments`, data);
  },

  update: async (id: string, data: Partial<CreateAppointmentInput>): Promise<Appointment> => {
    return api.patch<Appointment>(`/appointments/${id}`, data);
  },

  cancel: async (id: string): Promise<void> => {
    await api.patch(`/appointments/${id}/cancel`);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/appointments/${id}`);
  },

  // Transport
  assignTransport: async (id: string, data: AssignTransportInput): Promise<void> => {
    await api.post(`/appointments/${id}/transport`, data);
  },
};


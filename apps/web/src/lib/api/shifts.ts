import { api } from './client';

export interface CaregiverShift {
  id: string;
  careRecipientId: string;
  caregiverId: string;
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  actualStartTime?: string;
  actualEndTime?: string;
  checkInNotes?: string;
  checkOutNotes?: string;
  handoffNotes?: string;
  checkInLocation?: string;
  checkOutLocation?: string;
  createdAt: string;
  updatedAt: string;
  caregiver?: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
  };
  careRecipient?: {
    id: string;
    fullName: string;
    preferredName?: string;
    avatarUrl?: string;
  };
  createdBy?: {
    id: string;
    fullName: string;
  };
}

export interface CreateShiftDto {
  caregiverId: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface CheckInDto {
  notes?: string;
  location?: string;
}

export interface CheckOutDto {
  notes?: string;
  location?: string;
  handoffNotes?: string;
}

export interface OnDutyResponse {
  caregiver: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
  };
  shift: CaregiverShift;
}

export const shiftsApi = {
  // Create a new shift
  create: (careRecipientId: string, data: CreateShiftDto): Promise<CaregiverShift> =>
    api.post(`/care-recipients/${careRecipientId}/shifts`, data),

  // Get all shifts for a care recipient
  getAll: (careRecipientId: string): Promise<CaregiverShift[]> =>
    api.get(`/care-recipients/${careRecipientId}/shifts`),

  // Get shifts by date range
  getByDateRange: (
    careRecipientId: string,
    startDate: string,
    endDate: string
  ): Promise<CaregiverShift[]> =>
    api.get(`/care-recipients/${careRecipientId}/shifts/range?startDate=${startDate}&endDate=${endDate}`),

  // Get current active shift
  getCurrent: (careRecipientId: string): Promise<CaregiverShift | null> =>
    api.get(`/care-recipients/${careRecipientId}/shifts/current`),

  // Get upcoming shifts
  getUpcoming: (careRecipientId: string, limit = 5): Promise<CaregiverShift[]> =>
    api.get(`/care-recipients/${careRecipientId}/shifts/upcoming?limit=${limit}`),

  // Get who's currently on duty
  getOnDuty: (careRecipientId: string): Promise<OnDutyResponse | null> =>
    api.get(`/care-recipients/${careRecipientId}/shifts/on-duty`),

  // Get shift by ID
  getById: (careRecipientId: string, shiftId: string): Promise<CaregiverShift> =>
    api.get(`/care-recipients/${careRecipientId}/shifts/${shiftId}`),

  // Check in to a shift
  checkIn: (careRecipientId: string, shiftId: string, data?: CheckInDto): Promise<CaregiverShift> =>
    api.post(`/care-recipients/${careRecipientId}/shifts/${shiftId}/checkin`, data),

  // Check out from a shift
  checkOut: (careRecipientId: string, shiftId: string, data: CheckOutDto): Promise<CaregiverShift> =>
    api.post(`/care-recipients/${careRecipientId}/shifts/${shiftId}/checkout`, data),

  // Cancel a shift
  cancel: (careRecipientId: string, shiftId: string): Promise<CaregiverShift> =>
    api.patch(`/care-recipients/${careRecipientId}/shifts/${shiftId}/cancel`),

  // Get my shifts as a caregiver
  getMyShifts: (upcomingOnly = false): Promise<CaregiverShift[]> =>
    api.get(`/my-shifts?upcomingOnly=${upcomingOnly}`),
};

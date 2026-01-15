import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsService } from './service/appointments.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let prisma: PrismaService;
  let notificationsService: NotificationsService;

  const mockPrismaService = {
    appointment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    careRecipient: {
      findUnique: jest.fn(),
    },
    familyMember: {
      findUnique: jest.fn(),
    },
  };

  const mockNotificationsService = {
    notifyAppointmentReminder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    prisma = module.get<PrismaService>(PrismaService);
    notificationsService = module.get<NotificationsService>(NotificationsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an appointment', async () => {
      const careRecipientId = 'recipient-123';
      const userId = 'user-123';
      const createDto = {
        title: 'Doctor Visit',
        type: 'DOCTOR_VISIT' as const,
        startTime: new Date('2026-01-20T10:00:00'),
        endTime: new Date('2026-01-20T11:00:00'),
        location: 'Medical Center',
      };

      mockPrismaService.careRecipient.findUnique.mockResolvedValue({
        id: careRecipientId,
        familyId: 'family-123',
      });
      mockPrismaService.familyMember.findUnique.mockResolvedValue({
        role: 'CAREGIVER',
      });
      mockPrismaService.appointment.create.mockResolvedValue({
        id: 'appointment-123',
        ...createDto,
        careRecipientId,
      });

      const result = await service.create(careRecipientId, userId, createDto);

      expect(result).toHaveProperty('id', 'appointment-123');
      expect(mockPrismaService.appointment.create).toHaveBeenCalled();
    });
  });

  describe('findByCareRecipient', () => {
    it('should return appointments for care recipient', async () => {
      const careRecipientId = 'recipient-123';
      const userId = 'user-123';

      mockPrismaService.careRecipient.findUnique.mockResolvedValue({
        id: careRecipientId,
        familyId: 'family-123',
      });
      mockPrismaService.familyMember.findUnique.mockResolvedValue({
        role: 'VIEWER',
      });
      mockPrismaService.appointment.findMany.mockResolvedValue([
        {
          id: 'apt-1',
          title: 'Checkup',
          startTime: new Date(),
        },
      ]);

      const result = await service.findByCareRecipient(careRecipientId, userId);

      expect(Array.isArray(result)).toBe(true);
      expect(mockPrismaService.appointment.findMany).toHaveBeenCalled();
    });
  });
});

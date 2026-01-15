import { Test, TestingModule } from '@nestjs/testing';
import { EmergencyService } from './service/emergency.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('EmergencyService', () => {
  let service: EmergencyService;
  let prisma: PrismaService;
  let notificationsService: NotificationsService;

  const mockPrismaService = {
    emergencyAlert: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    careRecipient: {
      findUnique: jest.fn(),
    },
    familyMember: {
      findUnique: jest.fn(),
    },
  };

  const mockNotificationsService = {
    notifyEmergency: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmergencyService,
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

    service = module.get<EmergencyService>(EmergencyService);
    prisma = module.get<PrismaService>(PrismaService);
    notificationsService = module.get<NotificationsService>(NotificationsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAlert', () => {
    it('should create emergency alert and notify family', async () => {
      const careRecipientId = 'recipient-123';
      const userId = 'user-123';
      const createDto = {
        type: 'FALL' as const,
        title: 'Patient Fell',
        description: 'Patient fell in bathroom',
        location: 'Home',
      };

      mockPrismaService.careRecipient.findUnique.mockResolvedValue({
        id: careRecipientId,
        familyId: 'family-123',
        firstName: 'John',
      });
      mockPrismaService.familyMember.findUnique.mockResolvedValue({
        role: 'CAREGIVER',
      });
      mockPrismaService.emergencyAlert.create.mockResolvedValue({
        id: 'alert-123',
        ...createDto,
        careRecipientId,
        createdById: userId,
        status: 'ACTIVE',
        createdAt: new Date(),
      });

      const result = await service.createAlert(careRecipientId, userId, createDto);

      expect(result).toHaveProperty('id', 'alert-123');
      expect(mockNotificationsService.notifyEmergency).toHaveBeenCalledWith(
        'family-123',
        careRecipientId,
        expect.any(Object),
      );
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an emergency alert', async () => {
      const alertId = 'alert-123';
      const userId = 'user-123';
      const resolutionNotes = 'Situation handled, patient is safe';

      mockPrismaService.emergencyAlert.findUnique.mockResolvedValue({
        id: alertId,
        careRecipientId: 'recipient-123',
        status: 'ACTIVE',
      });
      mockPrismaService.careRecipient.findUnique.mockResolvedValue({
        familyId: 'family-123',
      });
      mockPrismaService.familyMember.findUnique.mockResolvedValue({
        role: 'ADMIN',
      });
      mockPrismaService.emergencyAlert.update.mockResolvedValue({
        id: alertId,
        status: 'RESOLVED',
        resolvedById: userId,
        resolvedAt: new Date(),
        resolutionNotes,
      });

      const result = await service.resolveAlert(alertId, userId, resolutionNotes);

      expect(result.status).toBe('RESOLVED');
      expect(result.resolvedById).toBe(userId);
    });
  });
});

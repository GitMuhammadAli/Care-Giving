import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../gateway/events.gateway';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaService: jest.Mocked<PrismaService>;
  let eventsGateway: jest.Mocked<EventsGateway>;

  const mockCareRecipient = {
    id: 'cr-123',
    firstName: 'John',
    lastName: 'Doe',
    preferredName: 'Johnny',
  };

  const mockFamilyMembers = [
    { id: 'fm-1', userId: 'user-1', familyId: 'family-123' },
    { id: 'fm-2', userId: 'user-2', familyId: 'family-123' },
  ];

  const mockAlert = {
    id: 'alert-123',
    type: 'FALL',
    title: 'Fall Detected',
    description: 'Care recipient may have fallen',
    status: 'ACTIVE',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: {
            careRecipient: {
              findUnique: jest.fn(),
            },
            familyMember: {
              findMany: jest.fn(),
            },
            notification: {
              create: jest.fn(),
              createMany: jest.fn(),
              findMany: jest.fn(),
              updateMany: jest.fn(),
              count: jest.fn(),
            },
            pushToken: {
              upsert: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
        {
          provide: EventsGateway,
          useValue: {
            emitToFamily: jest.fn(),
            emitToUser: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prismaService = module.get(PrismaService);
    eventsGateway = module.get(EventsGateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('notifyEmergency', () => {
    it('should send emergency notifications to all family members', async () => {
      (prismaService.careRecipient.findUnique as jest.Mock).mockResolvedValue(mockCareRecipient);
      (prismaService.familyMember.findMany as jest.Mock).mockResolvedValue(mockFamilyMembers);
      (prismaService.notification.createMany as jest.Mock).mockResolvedValue({ count: 2 });

      await service.notifyEmergency('family-123', 'cr-123', mockAlert);

      expect(prismaService.careRecipient.findUnique).toHaveBeenCalledWith({
        where: { id: 'cr-123' },
      });
      expect(eventsGateway.emitToFamily).toHaveBeenCalledWith(
        'family-123',
        'emergency',
        expect.objectContaining({
          alert: mockAlert,
        })
      );
      expect(prismaService.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: 'user-1',
            type: 'EMERGENCY_ALERT',
          }),
          expect.objectContaining({
            userId: 'user-2',
            type: 'EMERGENCY_ALERT',
          }),
        ]),
      });
    });

    it('should not send notifications if care recipient not found', async () => {
      (prismaService.careRecipient.findUnique as jest.Mock).mockResolvedValue(null);

      await service.notifyEmergency('family-123', 'invalid-id', mockAlert);

      expect(eventsGateway.emitToFamily).not.toHaveBeenCalled();
      expect(prismaService.notification.createMany).not.toHaveBeenCalled();
    });
  });

  describe('notifyMedicationReminder', () => {
    it('should send medication reminder to specific caregiver', async () => {
      const mockMedication = {
        id: 'med-123',
        name: 'Aspirin',
        dosage: '100mg',
      };

      (prismaService.notification.create as jest.Mock).mockResolvedValue({});

      await service.notifyMedicationReminder(mockMedication, mockCareRecipient, 'caregiver-123');

      expect(prismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'caregiver-123',
          type: 'MEDICATION_REMINDER',
          title: '💊 Medication Due',
          body: expect.stringContaining('Aspirin'),
        }),
      });
      expect(eventsGateway.emitToUser).toHaveBeenCalledWith(
        'caregiver-123',
        'medication_reminder',
        expect.any(Object)
      );
    });
  });

  describe('getNotifications', () => {
    it('should retrieve all notifications for a user', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'MEDICATION_REMINDER',
          title: 'Medication Due',
          read: false,
          createdAt: new Date(),
        },
        {
          id: 'notif-2',
          userId: 'user-1',
          type: 'APPOINTMENT_REMINDER',
          title: 'Appointment Soon',
          read: true,
          createdAt: new Date(),
        },
      ];

      (prismaService.notification.findMany as jest.Mock).mockResolvedValue(mockNotifications);

      const result = await service.getNotifications('user-1', false, 50);

      expect(result).toEqual(mockNotifications);
      expect(prismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should retrieve only unread notifications when specified', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'MEDICATION_REMINDER',
          read: false,
        },
      ];

      (prismaService.notification.findMany as jest.Mock).mockResolvedValue(mockNotifications);

      await service.getNotifications('user-1', true, 50);

      expect(prismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: false },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark a specific notification as read', async () => {
      (prismaService.notification.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.markAsRead('notif-123', 'user-1');

      expect(prismaService.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'notif-123',
          userId: 'user-1',
        },
        data: {
          read: true,
          readAt: expect.any(Date),
        },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read for a user', async () => {
      (prismaService.notification.updateMany as jest.Mock).mockResolvedValue({ count: 5 });

      await service.markAllAsRead('user-1');

      expect(prismaService.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          read: false,
        },
        data: {
          read: true,
          readAt: expect.any(Date),
        },
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      (prismaService.notification.count as jest.Mock).mockResolvedValue(3);

      const result = await service.getUnreadCount('user-1');

      expect(result).toBe(3);
      expect(prismaService.notification.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          read: false,
        },
      });
    });
  });

  describe('registerPushToken', () => {
    it('should register a new push token', async () => {
      (prismaService.pushToken.upsert as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        token: 'push-token-123',
        platform: 'WEB',
      });

      const result = await service.registerPushToken('user-1', 'push-token-123', 'WEB');

      expect(result).toEqual({ success: true });
      expect(prismaService.pushToken.upsert).toHaveBeenCalledWith({
        where: { token: 'push-token-123' },
        create: { userId: 'user-1', token: 'push-token-123', platform: 'WEB' },
        update: { userId: 'user-1', platform: 'WEB' },
      });
    });
  });

  describe('removePushToken', () => {
    it('should remove a push token', async () => {
      (prismaService.pushToken.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await service.removePushToken('push-token-123');

      expect(result).toEqual({ success: true });
      expect(prismaService.pushToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'push-token-123' },
      });
    });
  });
});

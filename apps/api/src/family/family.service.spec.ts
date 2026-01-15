import { Test, TestingModule } from '@nestjs/testing';
import { FamilyService } from './family.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../system/module/mail/mail.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('FamilyService', () => {
  let service: FamilyService;
  let prisma: PrismaService;
  let mailService: MailService;

  const mockPrismaService = {
    family: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    familyMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    familyInvitation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockMailService = {
    sendFamilyInvitation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();

    service = module.get<FamilyService>(FamilyService);
    prisma = module.get<PrismaService>(PrismaService);
    mailService = module.get<MailService>(MailService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createFamily', () => {
    it('should create a family with admin member', async () => {
      const userId = 'user-123';
      const createFamilyDto = { name: 'Test Family', nickname: 'Admin' };

      const mockFamily = {
        id: 'family-123',
        name: 'Test Family',
        members: [
          {
            id: 'member-123',
            userId,
            role: 'ADMIN',
            nickname: 'Admin',
            user: { id: userId, fullName: 'Test User', email: 'test@example.com' },
          },
        ],
      };

      mockPrismaService.family.create.mockResolvedValue(mockFamily);

      const result = await service.createFamily(userId, createFamilyDto);

      expect(result).toEqual(mockFamily);
      expect(mockPrismaService.family.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Family',
          members: {
            create: {
              userId,
              role: 'ADMIN',
              nickname: 'Admin',
            },
          },
        },
        include: expect.any(Object),
      });
    });
  });

  describe('inviteMember', () => {
    it('should create invitation and send email', async () => {
      const familyId = 'family-123';
      const invitedById = 'user-123';
      const inviteDto = { email: 'newmember@example.com', role: 'CAREGIVER' as const };

      mockPrismaService.familyMember.findUnique.mockResolvedValue({
        role: 'ADMIN',
      });
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // For checking existing user
        .mockResolvedValueOnce({ fullName: 'Admin User' }); // For getting inviter name
      mockPrismaService.familyInvitation.findFirst.mockResolvedValue(null);
      mockPrismaService.familyInvitation.create.mockResolvedValue({
        id: 'invite-123',
        email: 'newmember@example.com',
        role: 'CAREGIVER',
        token: 'test-token',
        expiresAt: new Date(),
        family: { name: 'Test Family' },
      });

      const result = await service.inviteMember(familyId, invitedById, inviteDto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email', 'newmember@example.com');
      expect(mockMailService.sendFamilyInvitation).toHaveBeenCalled();
    });

    it('should throw error if inviter is not admin', async () => {
      const familyId = 'family-123';
      const invitedById = 'user-123';
      const inviteDto = { email: 'newmember@example.com', role: 'CAREGIVER' as const };

      mockPrismaService.familyMember.findUnique.mockResolvedValue({
        role: 'VIEWER',
      });

      await expect(
        service.inviteMember(familyId, invitedById, inviteDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('resendInvitation', () => {
    it('should resend invitation email', async () => {
      const invitationId = 'invite-123';
      const adminId = 'user-123';

      mockPrismaService.familyInvitation.findUnique.mockResolvedValue({
        id: invitationId,
        email: 'test@example.com',
        status: 'PENDING',
        token: 'test-token',
        expiresAt: new Date(Date.now() + 86400000), // Tomorrow
        family: { name: 'Test Family' },
      });
      mockPrismaService.familyMember.findUnique.mockResolvedValue({
        role: 'ADMIN',
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        fullName: 'Admin User',
      });

      const result = await service.resendInvitation(invitationId, adminId);

      expect(result).toEqual({ success: true });
      expect(mockMailService.sendFamilyInvitation).toHaveBeenCalled();
    });

    it('should throw error if invitation not found', async () => {
      mockPrismaService.familyInvitation.findUnique.mockResolvedValue(null);

      await expect(
        service.resendInvitation('invalid-id', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if invitation is expired', async () => {
      mockPrismaService.familyInvitation.findUnique.mockResolvedValue({
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 86400000), // Yesterday
        familyId: 'family-123',
      });
      mockPrismaService.familyMember.findUnique.mockResolvedValue({
        role: 'ADMIN',
      });

      await expect(
        service.resendInvitation('invite-123', 'user-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getMyFamilies', () => {
    it('should return user families', async () => {
      const userId = 'user-123';
      const mockFamilies = [
        {
          id: 'family-1',
          name: 'Family 1',
          members: [],
          careRecipients: [],
          _count: { documents: 5 },
        },
      ];

      mockPrismaService.family.findMany.mockResolvedValue(mockFamilies);

      const result = await service.getMyFamilies(userId);

      expect(result).toEqual(mockFamilies);
      expect(mockPrismaService.family.findMany).toHaveBeenCalledWith({
        where: { members: { some: { userId } } },
        include: expect.any(Object),
      });
    });
  });
});

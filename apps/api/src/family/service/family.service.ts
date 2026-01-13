import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { addDays } from 'date-fns';

import { Family } from '../entity/family.entity';
import { FamilyMember, FamilyRole } from '../entity/family-member.entity';
import { FamilyInvitation, InvitationStatus } from '../entity/family-invitation.entity';
import { FamilyRepository } from '../repository/family.repository';
import { FamilyMemberRepository } from '../repository/family-member.repository';
import { FamilyInvitationRepository } from '../repository/family-invitation.repository';
import { UserRepository } from '../../user/repository/user.repository';
import { MailService } from '../../system/module/mail/mail.service';
import { ContextHelper } from '../../system/helper/context.helper';

import { CreateFamilyDto } from '../dto/create-family.dto';
import { InviteMemberDto } from '../dto/invite-member.dto';
import { UpdateMemberDto } from '../dto/update-member.dto';

@Injectable()
export class FamilyService {
  constructor(
    private readonly familyRepository: FamilyRepository,
    private readonly memberRepository: FamilyMemberRepository,
    private readonly invitationRepository: FamilyInvitationRepository,
    private readonly userRepository: UserRepository,
    private readonly mailService: MailService,
  ) {}

  async create(dto: CreateFamilyDto): Promise<Family> {
    const userId = ContextHelper.getUserId();

    // Create family
    const family = await this.familyRepository.createFamily({
      ...dto,
      settings: {
        timezone: dto.timezone || 'America/New_York',
        notificationsEnabled: true,
        emergencyContacts: [],
      },
    });

    // Add creator as admin
    await this.memberRepository.createMember({
      familyId: family.id,
      userId,
      role: FamilyRole.ADMIN,
    });

    return this.familyRepository.findById(family.id) as Promise<Family>;
  }

  async findById(id: string): Promise<Family> {
    const family = await this.familyRepository.findById(id);
    if (!family) {
      throw new NotFoundException('Family not found');
    }
    return family;
  }

  async findUserFamilies(userId: string): Promise<Family[]> {
    return this.familyRepository.findUserFamilies(userId);
  }

  async update(id: string, dto: Partial<CreateFamilyDto>): Promise<Family> {
    await this.ensureAdminAccess(id);
    return this.familyRepository.updateFamily(id, dto);
  }

  async inviteMember(familyId: string, dto: InviteMemberDto): Promise<FamilyInvitation> {
    const member = await this.ensureAdminAccess(familyId);
    const family = member.family;

    // Check if already a member
    const existingMember = await this.userRepository.findByEmail(dto.email);
    if (existingMember) {
      const isMember = await this.memberRepository.findByFamilyAndUser(
        familyId,
        existingMember.id,
      );
      if (isMember) {
        throw new ConflictException('User is already a member of this family');
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await this.invitationRepository.findExistingPending(
      familyId,
      dto.email,
    );
    if (existingInvitation) {
      throw new ConflictException('An invitation is already pending for this email');
    }

    // Create invitation
    const token = crypto.randomBytes(32).toString('hex');
    const invitation = await this.invitationRepository.createInvitation({
      familyId,
      email: dto.email,
      role: dto.role,
      token,
      message: dto.message,
      invitedById: ContextHelper.getUserId(),
      expiresAt: addDays(new Date(), 7),
    });

    // Send invitation email
    const inviter = await this.userRepository.findById(ContextHelper.getUserId()!);
    await this.mailService.sendFamilyInvitation(
      dto.email,
      inviter?.fullName || 'A family member',
      family.name,
      token,
    );

    return invitation;
  }

  async acceptInvitation(token: string): Promise<FamilyMember> {
    const invitation = await this.invitationRepository.findByToken(token);

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (!invitation.isPending()) {
      throw new BadRequestException('Invitation is expired or already used');
    }

    const userId = ContextHelper.getUserId();
    const user = await this.userRepository.findById(userId!);

    if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException('This invitation is for a different email address');
    }

    // Check if already a member
    const existingMember = await this.memberRepository.findByFamilyAndUser(
      invitation.familyId,
      userId!,
    );
    if (existingMember) {
      throw new ConflictException('You are already a member of this family');
    }

    // Create member
    const member = await this.memberRepository.createMember({
      familyId: invitation.familyId,
      userId,
      role: invitation.role,
    });

    // Update invitation status
    await this.invitationRepository.updateStatus(invitation.id, InvitationStatus.ACCEPTED);

    return member;
  }

  async declineInvitation(token: string): Promise<void> {
    const invitation = await this.invitationRepository.findByToken(token);

    if (!invitation || !invitation.isPending()) {
      throw new NotFoundException('Invitation not found or already processed');
    }

    await this.invitationRepository.updateStatus(invitation.id, InvitationStatus.DECLINED);
  }

  async cancelInvitation(familyId: string, invitationId: string): Promise<void> {
    await this.ensureAdminAccess(familyId);

    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId, familyId },
    });

    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new NotFoundException('Invitation not found or already processed');
    }

    await this.invitationRepository.updateStatus(invitationId, InvitationStatus.CANCELLED);
  }

  async resendInvitation(familyId: string, invitationId: string): Promise<void> {
    const member = await this.ensureAdminAccess(familyId);
    const family = member.family;

    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId, familyId, status: InvitationStatus.PENDING },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Generate new token and extend expiry
    const newToken = crypto.randomBytes(32).toString('hex');
    invitation.token = newToken;
    invitation.expiresAt = addDays(new Date(), 7);
    await this.invitationRepository.save(invitation);

    // Resend email
    const inviter = await this.userRepository.findById(ContextHelper.getUserId()!);
    await this.mailService.sendFamilyInvitation(
      invitation.email,
      inviter?.fullName || 'A family member',
      family.name,
      newToken,
    );
  }

  async getMembers(familyId: string): Promise<FamilyMember[]> {
    await this.ensureMemberAccess(familyId);
    return this.memberRepository.findByFamily(familyId);
  }

  async getPendingInvitations(familyId: string): Promise<FamilyInvitation[]> {
    await this.ensureAdminAccess(familyId);
    return this.invitationRepository.findPendingByFamily(familyId);
  }

  async updateMember(
    familyId: string,
    memberId: string,
    dto: UpdateMemberDto,
  ): Promise<FamilyMember> {
    const currentMember = await this.ensureAdminAccess(familyId);
    const targetMember = await this.memberRepository.findOne({
      where: { id: memberId, familyId },
    });

    if (!targetMember) {
      throw new NotFoundException('Member not found');
    }

    // Can't change own role
    if (dto.role && targetMember.userId === ContextHelper.getUserId()) {
      throw new ForbiddenException('You cannot change your own role');
    }

    // Check if this is the last admin
    if (dto.role && targetMember.role === FamilyRole.ADMIN && dto.role !== FamilyRole.ADMIN) {
      const adminCount = await this.memberRepository.countAdminsByFamily(familyId);
      if (adminCount <= 1) {
        throw new ForbiddenException('Cannot demote the last admin');
      }
    }

    Object.assign(targetMember, dto);
    return this.memberRepository.save(targetMember);
  }

  async removeMember(familyId: string, memberId: string): Promise<void> {
    await this.ensureAdminAccess(familyId);

    const targetMember = await this.memberRepository.findOne({
      where: { id: memberId, familyId },
    });

    if (!targetMember) {
      throw new NotFoundException('Member not found');
    }

    // Can't remove self
    if (targetMember.userId === ContextHelper.getUserId()) {
      throw new ForbiddenException('You cannot remove yourself from the family');
    }

    // Check if this is the last admin
    if (targetMember.role === FamilyRole.ADMIN) {
      const adminCount = await this.memberRepository.countAdminsByFamily(familyId);
      if (adminCount <= 1) {
        throw new ForbiddenException('Cannot remove the last admin');
      }
    }

    await this.memberRepository.deactivateMember(memberId);
  }

  async leaveFamily(familyId: string): Promise<void> {
    const userId = ContextHelper.getUserId();
    const member = await this.memberRepository.findByFamilyAndUser(familyId, userId!);

    if (!member) {
      throw new NotFoundException('You are not a member of this family');
    }

    // Check if this is the last admin
    if (member.role === FamilyRole.ADMIN) {
      const adminCount = await this.memberRepository.countAdminsByFamily(familyId);
      if (adminCount <= 1) {
        throw new ForbiddenException(
          'You are the last admin. Please assign another admin before leaving.',
        );
      }
    }

    await this.memberRepository.deactivateMember(member.id);
  }

  // Helper methods
  private async ensureAdminAccess(familyId: string): Promise<FamilyMember> {
    const userId = ContextHelper.getUserId();
    const member = await this.memberRepository.findByFamilyAndUser(familyId, userId!);

    if (!member) {
      throw new NotFoundException('Family not found');
    }

    if (!member.canManageFamily()) {
      throw new ForbiddenException('Admin access required');
    }

    return member;
  }

  private async ensureMemberAccess(familyId: string): Promise<FamilyMember> {
    const userId = ContextHelper.getUserId();
    const member = await this.memberRepository.findByFamilyAndUser(familyId, userId!);

    if (!member) {
      throw new NotFoundException('Family not found');
    }

    return member;
  }
}


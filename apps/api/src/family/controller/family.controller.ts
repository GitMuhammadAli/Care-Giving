import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { FamilyService } from '../service/family.service';
import { CreateFamilyDto } from '../dto/create-family.dto';
import { InviteMemberDto } from '../dto/invite-member.dto';
import { UpdateMemberDto } from '../dto/update-member.dto';

import { JwtAuthGuard } from '../../system/guard/jwt-auth.guard';
import { FamilyAccessGuard } from '../../system/guard/family-access.guard';
import { GetUser } from '../../system/decorator/current-user.decorator';
import { FamilyAccess } from '../../system/decorator/family-access.decorator';
import { CurrentUser } from '../../system/helper/context.helper';
import { Public } from '../../system/decorator/public.decorator';

@ApiTags('families')
@ApiBearerAuth()
@Controller('families')
@UseGuards(JwtAuthGuard)
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new family' })
  @ApiResponse({ status: 201, description: 'Family created' })
  async create(@Body() dto: CreateFamilyDto) {
    return this.familyService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user families' })
  async findAll(@GetUser() user: CurrentUser) {
    return this.familyService.findUserFamilies(user.id);
  }

  @Get(':familyId')
  @UseGuards(FamilyAccessGuard)
  @FamilyAccess()
  @ApiOperation({ summary: 'Get family by ID' })
  @ApiParam({ name: 'familyId', type: 'string' })
  async findOne(@Param('familyId') familyId: string) {
    return this.familyService.findById(familyId);
  }

  @Put(':familyId')
  @UseGuards(FamilyAccessGuard)
  @FamilyAccess({ roles: ['ADMIN'] })
  @ApiOperation({ summary: 'Update family' })
  async update(
    @Param('familyId') familyId: string,
    @Body() dto: Partial<CreateFamilyDto>,
  ) {
    return this.familyService.update(familyId, dto);
  }

  // Members
  @Get(':familyId/members')
  @UseGuards(FamilyAccessGuard)
  @FamilyAccess()
  @ApiOperation({ summary: 'Get family members' })
  async getMembers(@Param('familyId') familyId: string) {
    return this.familyService.getMembers(familyId);
  }

  @Put(':familyId/members/:memberId')
  @UseGuards(FamilyAccessGuard)
  @FamilyAccess({ roles: ['ADMIN'] })
  @ApiOperation({ summary: 'Update member' })
  async updateMember(
    @Param('familyId') familyId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.familyService.updateMember(familyId, memberId, dto);
  }

  @Delete(':familyId/members/:memberId')
  @UseGuards(FamilyAccessGuard)
  @FamilyAccess({ roles: ['ADMIN'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member' })
  async removeMember(
    @Param('familyId') familyId: string,
    @Param('memberId') memberId: string,
  ) {
    await this.familyService.removeMember(familyId, memberId);
  }

  @Post(':familyId/leave')
  @UseGuards(FamilyAccessGuard)
  @FamilyAccess()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Leave family' })
  async leaveFamily(@Param('familyId') familyId: string) {
    await this.familyService.leaveFamily(familyId);
  }

  // Invitations
  @Post(':familyId/invitations')
  @UseGuards(FamilyAccessGuard)
  @FamilyAccess({ roles: ['ADMIN'] })
  @ApiOperation({ summary: 'Invite member' })
  async inviteMember(
    @Param('familyId') familyId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.familyService.inviteMember(familyId, dto);
  }

  @Get(':familyId/invitations')
  @UseGuards(FamilyAccessGuard)
  @FamilyAccess({ roles: ['ADMIN'] })
  @ApiOperation({ summary: 'Get pending invitations' })
  async getPendingInvitations(@Param('familyId') familyId: string) {
    return this.familyService.getPendingInvitations(familyId);
  }

  @Post(':familyId/invitations/:invitationId/resend')
  @UseGuards(FamilyAccessGuard)
  @FamilyAccess({ roles: ['ADMIN'] })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend invitation' })
  async resendInvitation(
    @Param('familyId') familyId: string,
    @Param('invitationId') invitationId: string,
  ) {
    await this.familyService.resendInvitation(familyId, invitationId);
    return { message: 'Invitation resent' };
  }

  @Delete(':familyId/invitations/:invitationId')
  @UseGuards(FamilyAccessGuard)
  @FamilyAccess({ roles: ['ADMIN'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel invitation' })
  async cancelInvitation(
    @Param('familyId') familyId: string,
    @Param('invitationId') invitationId: string,
  ) {
    await this.familyService.cancelInvitation(familyId, invitationId);
  }

  // Public invitation details (no auth required - for accept-invite page)
  @Get('invitations/:token/details')
  @Public()
  @ApiOperation({ summary: 'Get invitation details (public)' })
  @ApiResponse({ status: 200, description: 'Invitation details' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async getInvitationDetails(@Param('token') token: string) {
    return this.familyService.getInvitationDetails(token);
  }

  // Accept/Decline (requires auth)
  @Post('invitations/:token/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept invitation' })
  async acceptInvitation(@Param('token') token: string) {
    return this.familyService.acceptInvitation(token);
  }

  @Post('invitations/:token/decline')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Decline invitation' })
  async declineInvitation(@Param('token') token: string) {
    await this.familyService.declineInvitation(token);
  }

  // Admin password reset for family members (e.g., elderly care)
  @Post(':familyId/members/:userId/reset-password')
  @FamilyAccess({ roles: ['ADMIN'] })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password for family member (Admin only)' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Family member not found' })
  async resetMemberPassword(
    @Param('familyId') familyId: string,
    @Param('userId') userId: string,
  ) {
    return this.familyService.resetMemberPassword(familyId, userId);
  }
}


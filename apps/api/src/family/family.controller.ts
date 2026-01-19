import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FamilyService } from './family.service';
import { JwtAuthGuard } from '../system/guard/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CreateFamilyDto } from './dto/create-family.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { Public } from '../system/decorator/public.decorator';

@ApiTags('Families')
@ApiBearerAuth('JWT-auth')
@Controller('families')
@UseGuards(JwtAuthGuard)
export class FamilyController {
  constructor(private familyService: FamilyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new family' })
  @ApiResponse({ status: 201, description: 'Family created successfully' })
  createFamily(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateFamilyDto) {
    return this.familyService.createFamily(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all families for current user' })
  @ApiResponse({ status: 200, description: 'List of user families' })
  getMyFamilies(@CurrentUser() user: CurrentUserPayload) {
    return this.familyService.getMyFamilies(user.id);
  }

  @Get(':familyId')
  @ApiOperation({ summary: 'Get family details by ID' })
  @ApiResponse({ status: 200, description: 'Family details' })
  @ApiResponse({ status: 403, description: 'Not a member of this family' })
  getFamily(@Param('familyId') familyId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.familyService.getFamily(familyId, user.id);
  }

  @Post(':familyId/invite')
  @ApiOperation({ summary: 'Invite a member to family (Admin only)' })
  @ApiResponse({ status: 201, description: 'Invitation sent' })
  @ApiResponse({ status: 403, description: 'Only admins can invite members' })
  inviteMember(
    @Param('familyId') familyId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: InviteMemberDto,
  ) {
    return this.familyService.inviteMember(familyId, user.id, dto);
  }

  @Public()
  @Get('invitations/:token/details')
  @ApiOperation({ summary: 'Get invitation details (Public)' })
  @ApiResponse({ status: 200, description: 'Invitation details' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  getInvitationDetails(@Param('token') token: string) {
    return this.familyService.getInvitationDetails(token);
  }

  @Post('invitations/:token/accept')
  @ApiOperation({ summary: 'Accept family invitation' })
  @ApiResponse({ status: 200, description: 'Invitation accepted' })
  acceptInvitation(
    @Param('token') token: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.familyService.acceptInvitation(token, user.id);
  }

  @Public()
  @Post('invitations/:token/decline')
  @ApiOperation({ summary: 'Decline family invitation (Public)' })
  @ApiResponse({ status: 200, description: 'Invitation declined' })
  declineInvitation(@Param('token') token: string) {
    return this.familyService.declineInvitation(token);
  }

  @Patch(':familyId/members/:memberId/role')
  @ApiOperation({ summary: 'Update member role (Admin only)' })
  @ApiResponse({ status: 200, description: 'Member role updated successfully' })
  @ApiResponse({ status: 403, description: 'Only admins can update member roles' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  updateMemberRole(
    @Param('familyId') familyId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.familyService.updateMemberRole(familyId, memberId, user.id, dto.role);
  }

  @Delete(':familyId/members/:memberId')
  @ApiOperation({ summary: 'Remove member from family (Admin only)' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiResponse({ status: 403, description: 'Only admins can remove members' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  removeMember(
    @Param('familyId') familyId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.familyService.removeMember(familyId, memberId, user.id);
  }

  @Delete('invitations/:invitationId')
  @ApiOperation({ summary: 'Cancel pending invitation (Admin only)' })
  @ApiResponse({ status: 200, description: 'Invitation cancelled successfully' })
  @ApiResponse({ status: 403, description: 'Only admins can cancel invitations' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  cancelInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.familyService.cancelInvitation(invitationId, user.id);
  }

  @Post('invitations/:invitationId/resend')
  @ApiOperation({ summary: 'Resend invitation email (Admin only)' })
  @ApiResponse({ status: 200, description: 'Invitation resent successfully' })
  @ApiResponse({ status: 403, description: 'Only admins can resend invitations' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  resendInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.familyService.resendInvitation(invitationId, user.id);
  }
}


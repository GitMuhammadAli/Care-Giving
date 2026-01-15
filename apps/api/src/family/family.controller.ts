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
import { FamilyService } from './family.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CreateFamilyDto } from './dto/create-family.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

@Controller('families')
@UseGuards(JwtAuthGuard)
export class FamilyController {
  constructor(private familyService: FamilyService) {}

  @Post()
  createFamily(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateFamilyDto) {
    return this.familyService.createFamily(user.id, dto);
  }

  @Get()
  getMyFamilies(@CurrentUser() user: CurrentUserPayload) {
    return this.familyService.getMyFamilies(user.id);
  }

  @Get(':familyId')
  getFamily(@Param('familyId') familyId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.familyService.getFamily(familyId, user.id);
  }

  @Post(':familyId/invite')
  inviteMember(
    @Param('familyId') familyId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: InviteMemberDto,
  ) {
    return this.familyService.inviteMember(familyId, user.id, dto);
  }

  @Post('invitations/:token/accept')
  acceptInvitation(
    @Param('token') token: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.familyService.acceptInvitation(token, user.id);
  }

  @Patch(':familyId/members/:memberId/role')
  updateMemberRole(
    @Param('familyId') familyId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.familyService.updateMemberRole(familyId, memberId, user.id, dto.role);
  }

  @Delete(':familyId/members/:memberId')
  removeMember(
    @Param('familyId') familyId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.familyService.removeMember(familyId, memberId, user.id);
  }

  @Delete('invitations/:invitationId')
  cancelInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.familyService.cancelInvitation(invitationId, user.id);
  }

  @Post('invitations/:invitationId/resend')
  resendInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.familyService.resendInvitation(invitationId, user.id);
  }
}


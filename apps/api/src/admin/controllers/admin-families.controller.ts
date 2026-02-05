import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminFamiliesService } from '../services/admin-families.service';
import { JwtAuthGuard } from '../../system/guard/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AdminFamilyFilterDto } from '../dto/admin-family-filter.dto';
import { BulkFamilyActionDto } from '../dto/bulk-action.dto';

@ApiTags('Admin - Families')
@ApiBearerAuth('JWT-auth')
@Controller('admin/families')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminFamiliesController {
  constructor(private adminFamiliesService: AdminFamiliesService) {}

  @Get()
  @ApiOperation({ summary: 'List all families (paginated, filterable)' })
  @ApiResponse({ status: 200, description: 'List of families' })
  findAll(@Query() filter: AdminFamilyFilterDto) {
    return this.adminFamiliesService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get family details with members and care recipients' })
  @ApiResponse({ status: 200, description: 'Family details' })
  @ApiResponse({ status: 404, description: 'Family not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminFamiliesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update family details' })
  @ApiResponse({ status: 200, description: 'Family updated' })
  @ApiResponse({ status: 404, description: 'Family not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: { name?: string },
    @CurrentUser() admin: CurrentUserPayload,
  ) {
    return this.adminFamiliesService.update(id, data, admin.id);
  }

  @Delete(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Delete family (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Family deleted' })
  @ApiResponse({ status: 404, description: 'Family not found' })
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() admin: CurrentUserPayload,
  ) {
    return this.adminFamiliesService.delete(id, admin.id, reason);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get family members' })
  @ApiResponse({ status: 200, description: 'List of family members' })
  @ApiResponse({ status: 404, description: 'Family not found' })
  getMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminFamiliesService.getMembers(id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to family' })
  @ApiResponse({ status: 201, description: 'Member added' })
  @ApiResponse({ status: 404, description: 'Family or user not found' })
  @ApiResponse({ status: 400, description: 'User is already a member' })
  addMember(
    @Param('id', ParseUUIDPipe) familyId: string,
    @Body() body: { userId: string; role: 'ADMIN' | 'CAREGIVER' | 'VIEWER' },
    @CurrentUser() admin: CurrentUserPayload,
  ) {
    return this.adminFamiliesService.addMember(familyId, body.userId, body.role, admin.id);
  }

  @Delete(':familyId/members/:memberId')
  @ApiOperation({ summary: 'Remove member from family' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  removeMember(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() admin: CurrentUserPayload,
  ) {
    return this.adminFamiliesService.removeMember(familyId, memberId, admin.id);
  }

  @Post(':id/transfer')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Transfer family ownership (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Ownership transferred' })
  @ApiResponse({ status: 404, description: 'Family not found' })
  @ApiResponse({ status: 400, description: 'New owner must be an existing member' })
  transferOwnership(
    @Param('id', ParseUUIDPipe) familyId: string,
    @Body('newOwnerId') newOwnerId: string,
    @CurrentUser() admin: CurrentUserPayload,
  ) {
    return this.adminFamiliesService.transferOwnership(familyId, newOwnerId, admin.id);
  }

  @Get(':id/activity')
  @ApiOperation({ summary: 'Get family activity log' })
  @ApiResponse({ status: 200, description: 'Family activity' })
  @ApiResponse({ status: 404, description: 'Family not found' })
  getActivity(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminFamiliesService.getActivity(id);
  }

  @Post('bulk-action')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Perform bulk action on families (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Bulk action completed' })
  bulkAction(@Body() dto: BulkFamilyActionDto, @CurrentUser() admin: CurrentUserPayload) {
    return this.adminFamiliesService.bulkAction(dto, admin.id);
  }
}


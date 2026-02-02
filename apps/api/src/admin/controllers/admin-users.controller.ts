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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminUsersService } from '../services/admin-users.service';
import { JwtAuthGuard } from '../../system/guard/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AdminUserFilterDto } from '../dto/admin-user-filter.dto';
import { AdminUpdateUserDto, AdminCreateUserDto } from '../dto/admin-update-user.dto';
import { BulkUserActionDto } from '../dto/bulk-action.dto';

@ApiTags('Admin - Users')
@ApiBearerAuth('JWT-auth')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminUsersController {
  constructor(private adminUsersService: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users (paginated, filterable)' })
  @ApiResponse({ status: 200, description: 'List of users' })
  findAll(@Query() filter: AdminUserFilterDto) {
    return this.adminUsersService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.adminUsersService.findOne(id);
  }

  @Post()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Create a new user (Super Admin only)' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  create(@Body() dto: AdminCreateUserDto, @CurrentUser() admin: CurrentUserPayload) {
    return this.adminUsersService.create(dto, admin.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
    @CurrentUser() admin: CurrentUserPayload,
  ) {
    return this.adminUsersService.update(id, dto, admin.id);
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: 'Suspend user account' })
  @ApiResponse({ status: 200, description: 'User suspended' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Cannot suspend super admin' })
  suspend(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() admin: CurrentUserPayload,
  ) {
    return this.adminUsersService.suspend(id, admin.id, reason);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate user account' })
  @ApiResponse({ status: 200, description: 'User activated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  activate(@Param('id') id: string, @CurrentUser() admin: CurrentUserPayload) {
    return this.adminUsersService.activate(id, admin.id);
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Force password reset for user' })
  @ApiResponse({ status: 200, description: 'Password reset initiated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  resetPassword(@Param('id') id: string, @CurrentUser() admin: CurrentUserPayload) {
    return this.adminUsersService.resetPassword(id, admin.id);
  }

  @Delete(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Delete user (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete super admin' })
  delete(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() admin: CurrentUserPayload,
  ) {
    return this.adminUsersService.delete(id, admin.id, reason);
  }

  @Post('bulk-action')
  @ApiOperation({ summary: 'Perform bulk action on users' })
  @ApiResponse({ status: 200, description: 'Bulk action completed' })
  bulkAction(@Body() dto: BulkUserActionDto, @CurrentUser() admin: CurrentUserPayload) {
    return this.adminUsersService.bulkAction(dto, admin.id);
  }

  @Get(':id/activity')
  @ApiOperation({ summary: 'Get user activity log' })
  @ApiResponse({ status: 200, description: 'User activity' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserActivity(@Param('id') id: string) {
    return this.adminUsersService.getUserActivity(id);
  }
}


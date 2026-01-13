import {
  Controller,
  Get,
  Put,
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
} from '@nestjs/swagger';
import { UserService } from '../service/user.service';
import { UpdateUserDto } from '../dto/update-user.dto';
import { JwtAuthGuard } from '../../system/guard/jwt-auth.guard';
import { PermissionsGuard } from '../../system/guard/permissions.guard';
import { GetUser } from '../../system/decorator/current-user.decorator';
import { Permissions } from '../../system/decorator/permissions.decorator';
import { CurrentUser } from '../../system/helper/context.helper';
import { User } from '../entity/user.entity';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  async getMe(@GetUser() user: CurrentUser): Promise<User> {
    return this.userService.findById(user.id);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateMe(
    @GetUser() user: CurrentUser,
    @Body() dto: UpdateUserDto,
  ): Promise<User> {
    return this.userService.update(user.id, dto);
  }

  @Get('me/preferences')
  @ApiOperation({ summary: 'Get user preferences' })
  async getPreferences(@GetUser() user: CurrentUser) {
    return this.userService.getPreferences(user.id);
  }

  @Put('me/preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  async updatePreferences(
    @GetUser() user: CurrentUser,
    @Body() preferences: User['preferences'],
  ) {
    return this.userService.updatePreferences(user.id, preferences);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('view_users')
  @ApiOperation({ summary: 'Get user by ID (admin)' })
  async findById(@Param('id') id: string): Promise<User> {
    return this.userService.findById(id);
  }
}


import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmergencyService } from './emergency.service';
import { CreateEmergencyAlertDto } from './dto/create-emergency-alert.dto';
import { ResolveAlertDto } from './dto/resolve-alert.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface CurrentUserPayload {
  id: string;
  email: string;
}

@ApiTags('Emergency')
@ApiBearerAuth()
@Controller('care-recipients/:careRecipientId/emergency')
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

  @Get('info')
  @ApiOperation({ summary: 'Get complete emergency info for care recipient (for offline caching)' })
  getEmergencyInfo(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.emergencyService.getEmergencyInfo(careRecipientId, user.id);
  }

  @Post('alerts')
  @ApiOperation({ summary: 'Create an emergency alert' })
  createAlert(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateEmergencyAlertDto,
  ) {
    return this.emergencyService.createEmergencyAlert(careRecipientId, user.id, dto);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get active emergency alerts' })
  getActiveAlerts(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.emergencyService.getActiveAlerts(careRecipientId, user.id);
  }

  @Get('alerts/history')
  @ApiOperation({ summary: 'Get alert history' })
  getAlertHistory(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('limit') limit?: string,
  ) {
    return this.emergencyService.getAlertHistory(careRecipientId, user.id, limit ? parseInt(limit, 10) : 20);
  }

  @Post('alerts/:alertId/acknowledge')
  @ApiOperation({ summary: 'Acknowledge an emergency alert' })
  acknowledgeAlert(
    @Param('alertId', ParseUUIDPipe) alertId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.emergencyService.acknowledgeAlert(alertId, user.id);
  }

  @Post('alerts/:alertId/resolve')
  @ApiOperation({ summary: 'Resolve an emergency alert' })
  resolveAlert(
    @Param('alertId', ParseUUIDPipe) alertId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ResolveAlertDto,
  ) {
    return this.emergencyService.resolveAlert(alertId, user.id, dto.resolutionNotes);
  }
}

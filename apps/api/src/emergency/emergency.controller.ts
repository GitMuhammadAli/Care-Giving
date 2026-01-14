import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmergencyService } from './service/emergency.service';
import { CreateEmergencyAlertDto } from './dto/create-emergency-alert.dto';
import { ResolveAlertDto } from './dto/resolve-alert.dto';

@ApiTags('Emergency')
@ApiBearerAuth()
@Controller('families/:familyId/emergency')
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

  @Post('alert')
  @ApiOperation({ summary: 'Create an emergency alert' })
  createAlert(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() dto: CreateEmergencyAlertDto & { careRecipientId: string },
  ) {
    return this.emergencyService.createAlert(
      dto.careRecipientId,
      familyId,
      dto,
    );
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get all emergency alerts for a family' })
  findAll(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Query('limit') limit?: number,
  ) {
    return this.emergencyService.findByFamily(familyId, limit || 20);
  }

  @Get('alerts/active')
  @ApiOperation({ summary: 'Get active emergency alerts' })
  getActive(@Param('familyId', ParseUUIDPipe) familyId: string) {
    return this.emergencyService.findActive(familyId);
  }

  @Get('alerts/:id')
  @ApiOperation({ summary: 'Get an emergency alert by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.emergencyService.findOne(id);
  }

  @Post('alerts/:id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge an emergency alert' })
  acknowledge(@Param('id', ParseUUIDPipe) id: string) {
    return this.emergencyService.acknowledge(id);
  }

  @Post('alerts/:id/resolve')
  @ApiOperation({ summary: 'Resolve an emergency alert' })
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveAlertDto,
  ) {
    return this.emergencyService.resolve(id, dto);
  }

  @Patch('alerts/:id/cancel')
  @ApiOperation({ summary: 'Cancel an emergency alert' })
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.emergencyService.cancel(id);
  }

  @Get(':careRecipientId/info')
  @ApiOperation({ summary: 'Get complete emergency info for care recipient (for offline caching)' })
  getEmergencyInfo(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
  ) {
    return this.emergencyService.getEmergencyInfo(careRecipientId, familyId);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface CurrentUserPayload {
  id: string;
  email: string;
}

@ApiTags('Documents')
@ApiBearerAuth('JWT-auth')
@Controller('families/:familyId/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create document record (file upload handled separately)' })
  create(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UploadDocumentDto & { s3Key: string; mimeType: string; sizeBytes: number },
  ) {
    return this.documentsService.create(familyId, user.id, dto, {
      s3Key: dto.s3Key,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents for a family' })
  findAll(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('type') type?: string,
  ) {
    return this.documentsService.findAll(familyId, user.id, type);
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Get documents expiring soon' })
  getExpiring(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('days') days?: string,
  ) {
    return this.documentsService.getExpiringDocuments(familyId, user.id, days ? parseInt(days, 10) : 30);
  }

  @Get('by-category')
  @ApiOperation({ summary: 'Get documents grouped by category' })
  getByCategory(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.documentsService.getByCategory(familyId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.documentsService.findOne(id, user.id);
  }

  @Get(':id/url')
  @ApiOperation({ summary: 'Get a signed URL for viewing/downloading a document' })
  getSignedUrl(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.documentsService.getSignedUrl(id, familyId, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a document' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.documentsService.delete(id, user.id);
  }
}

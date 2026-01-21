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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { DocumentsService } from './documents.service';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StorageService } from '../system/module/storage/storage.service';
import { DocumentUploadJob } from './documents.processor';

interface CurrentUserPayload {
  id: string;
  email: string;
}

@ApiTags('Documents')
@ApiBearerAuth('JWT-auth')
@Controller('families/:familyId/documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly storageService: StorageService,
    @InjectQueue('document-upload') private documentQueue: Queue<DocumentUploadJob>,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Upload a document (async - returns immediately)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: { name?: string; type?: string; notes?: string; expiresAt?: string },
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Create a pending document record first (returns immediately to user)
    const document = await this.documentsService.createPending(familyId, user.id, {
      name: dto.name || file.originalname.replace(/\.[^/.]+$/, ''),
      type: dto.type,
      notes: dto.notes,
      expiresAt: dto.expiresAt,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });

    // Add upload job to queue (processed in background)
    await this.documentQueue.add(
      'upload',
      {
        documentId: document.id,
        familyId,
        userId: user.id,
        file: {
          buffer: file.buffer.toString('base64'),
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        },
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    // Return immediately with the pending document
    return document;
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

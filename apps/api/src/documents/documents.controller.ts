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
  UseGuards,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FamilyRole } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StorageService } from '../system/module/storage/storage.service';
import { FamilyAccessGuard } from '../system/guard/family-access.guard';
import { FamilyAccess } from '../system/decorator/family-access.decorator';

interface CurrentUserPayload {
  id: string;
  email: string;
}

@ApiTags('Documents')
@ApiBearerAuth('JWT-auth')
@UseGuards(FamilyAccessGuard)
@FamilyAccess({ param: 'familyId' })
@Controller('families/:familyId/documents')
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);

  constructor(
    private readonly documentsService: DocumentsService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @FamilyAccess({ param: 'familyId', roles: [FamilyRole.ADMIN, FamilyRole.CAREGIVER] })
  @ApiOperation({ summary: 'Upload a document (ADMIN/CAREGIVER only)' })
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

    // 1. Upload file to Cloudinary synchronously (2-5 seconds)
    const resourceType = this.getResourceType(file.mimetype);

    this.logger.log(
      `Uploading document to Cloudinary: ${file.originalname} (${(file.size / 1024).toFixed(1)}KB, ${resourceType})`,
    );

    const uploadResult = await this.storageService.upload(file, {
      folder: `carecircle/documents/${familyId}`,
      resourceType,
    });

    // 2. Create document record with status READY and URL already set
    return this.documentsService.create(familyId, user.id, {
      name: dto.name || file.originalname.replace(/\.[^/.]+$/, ''),
      type: dto.type,
      notes: dto.notes,
      expiresAt: dto.expiresAt,
    }, {
      s3Key: uploadResult.key,
      url: uploadResult.url,
      mimeType: file.mimetype,
      sizeBytes: file.size,
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
  @FamilyAccess({ param: 'familyId', roles: [FamilyRole.ADMIN, FamilyRole.CAREGIVER] })
  @ApiOperation({ summary: 'Update a document (ADMIN/CAREGIVER only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @FamilyAccess({ param: 'familyId', roles: [FamilyRole.ADMIN] })
  @ApiOperation({ summary: 'Delete a document (ADMIN only)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.documentsService.delete(id, user.id);
  }

  /** Map MIME type to Cloudinary resource type */
  private getResourceType(mimeType: string): 'image' | 'raw' | 'video' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'raw';
  }
}

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
import { DocumentsService } from './documents.service';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StorageService } from '../system/module/storage/storage.service';

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
  ) {}

  @Post()
  @ApiOperation({ summary: 'Upload a document' })
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

    // Determine resource type based on mimeType
    // PDFs and documents should be 'raw', images should be 'image'
    let resourceType: 'image' | 'raw' | 'video' | 'auto' = 'raw';
    if (file.mimetype.startsWith('image/')) {
      resourceType = 'image';
    } else if (file.mimetype.startsWith('video/')) {
      resourceType = 'video';
    }

    // Upload file to Cloudinary
    const uploadResult = await this.storageService.upload(file, {
      folder: `carecircle/documents/${familyId}`,
      resourceType,
    });

    const documentDto = {
      name: dto.name || file.originalname.replace(/\.[^/.]+$/, ''),
      type: dto.type as any,
      notes: dto.notes,
      expiresAt: dto.expiresAt,
    };

    return this.documentsService.create(familyId, user.id, documentDto, {
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

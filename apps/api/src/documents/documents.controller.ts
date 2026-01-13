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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { DocumentsService } from './service/documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentCategory } from './entity/document.entity';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('care-recipients/:careRecipientId/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a new document' })
  upload(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.documentsService.upload(careRecipientId, file, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents for a care recipient' })
  findAll(@Param('careRecipientId', ParseUUIDPipe) careRecipientId: string) {
    return this.documentsService.findAll(careRecipientId);
  }

  @Get('by-category')
  @ApiOperation({ summary: 'Get documents by category' })
  getByCategory(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @Query('category') category: DocumentCategory,
  ) {
    return this.documentsService.findByCategory(careRecipientId, category);
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Get documents expiring soon' })
  getExpiring(
    @Param('careRecipientId', ParseUUIDPipe) careRecipientId: string,
    @Query('days') days?: number,
  ) {
    return this.documentsService.getExpiringDocuments(careRecipientId, days || 30);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.findOne(id);
  }

  @Get(':id/url')
  @ApiOperation({ summary: 'Get signed URL for document' })
  getSignedUrl(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.getSignedUrl(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a document' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.remove(id);
  }
}

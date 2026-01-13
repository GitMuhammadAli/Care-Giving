// @ts-nocheck
// TypeORM-based service - kept for reference/migration
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Document, DocumentCategory } from '../entity/document.entity';
import { DocumentRepository } from '../repository/document.repository';
import { UploadDocumentDto } from '../dto/upload-document.dto';
import { UpdateDocumentDto } from '../dto/update-document.dto';
import { StorageService } from '../../system/module/storage/storage.service';
import { ContextHelper } from '../../system/helper/context.helper';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentRepository)
    private readonly documentRepository: DocumentRepository,
    private readonly storageService: StorageService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async upload(
    careRecipientId: string,
    file: Express.Multer.File,
    dto: UploadDocumentDto,
  ): Promise<Document> {
    const user = ContextHelper.getUser();

    // Upload to storage
    const { url, key } = await this.storageService.upload(file, {
      folder: `documents/${careRecipientId}`,
    });

    const document = this.documentRepository.create({
      title: dto.title,
      category: dto.category as DocumentCategory,
      description: dto.description,
      fileName: file.originalname,
      fileUrl: url,
      fileType: file.mimetype,
      fileSize: file.size,
      storageKey: key,
      expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : null,
      careRecipientId,
      uploadedById: user.id,
    });

    const saved = await this.documentRepository.save(document);

    this.eventEmitter.emit('document.uploaded', saved);

    return saved;
  }

  async findAll(careRecipientId: string): Promise<Document[]> {
    return this.documentRepository.findByCareRecipient(careRecipientId);
  }

  async findByCategory(
    careRecipientId: string,
    category: DocumentCategory,
  ): Promise<Document[]> {
    return this.documentRepository.findByCategory(careRecipientId, category);
  }

  async findOne(id: string): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id },
      relations: ['uploadedBy'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async update(id: string, dto: UpdateDocumentDto): Promise<Document> {
    const document = await this.findOne(id);
    
    Object.assign(document, dto);
    return this.documentRepository.save(document);
  }

  async remove(id: string): Promise<void> {
    const document = await this.findOne(id);

    // Delete from storage
    if (document.storageKey) {
      await this.storageService.delete(document.storageKey);
    }

    await this.documentRepository.softRemove(document);

    this.eventEmitter.emit('document.deleted', { id });
  }

  async getExpiringDocuments(careRecipientId: string, daysAhead = 30): Promise<Document[]> {
    return this.documentRepository.findExpiringDocuments(careRecipientId, daysAhead);
  }

  async getSignedUrl(id: string): Promise<string> {
    const document = await this.findOne(id);
    
    if (document.storageKey) {
      return this.storageService.getSignedUrl(document.storageKey);
    }
    
    return document.fileUrl;
  }
}


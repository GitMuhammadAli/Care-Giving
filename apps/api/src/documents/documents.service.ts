import { Injectable, NotFoundException, ForbiddenException, Logger, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../system/module/storage/storage.service';
import { EventPublisherService } from '../events/publishers/event-publisher.service';
import { ROUTING_KEYS } from '../events/events.constants';
import { EmbeddingIndexerService } from '../ai/services/embedding-indexer.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private eventEmitter: EventEmitter2,
    private eventPublisher: EventPublisherService,
    @Optional() private embeddingIndexer?: EmbeddingIndexerService,
  ) {}

  private async verifyFamilyAccess(familyId: string, userId: string) {
    const membership = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this family');
    }

    return membership;
  }

  /**
   * Create a document record with the file already uploaded to storage.
   * The controller uploads to Cloudinary first, then calls this with the URL.
   */
  async create(
    familyId: string,
    userId: string,
    dto: { name: string; type?: string; notes?: string; expiresAt?: string },
    file: { s3Key: string; url: string; mimeType: string; sizeBytes: number },
  ) {
    const membership = await this.verifyFamilyAccess(familyId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot upload documents');
    }

    // Get uploader info
    const uploader = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });

    const document = await this.prisma.document.create({
      data: {
        familyId,
        uploadedById: userId,
        name: dto.name,
        type: (dto.type as any) || 'OTHER',
        status: 'READY',
        s3Key: file.s3Key,
        url: file.url,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        notes: dto.notes,
      },
    });

    // Publish event for real-time sync
    try {
      await this.eventPublisher.publish(
        ROUTING_KEYS.DOCUMENT_UPLOADED,
        {
          documentId: document.id,
          documentName: document.name,
          documentType: document.type,
          familyId,
          uploadedById: userId,
          uploadedByName: uploader?.fullName || 'Unknown',
        },
        { aggregateType: 'Document', aggregateId: document.id },
        { familyId, causedBy: userId },
      );
    } catch (error) {
      this.logger.warn(`Failed to publish document.uploaded event: ${error.message}`);
    }

    // Also emit internal event for local WebSocket broadcast
    this.eventEmitter.emit('document.uploaded', {
      document,
      uploadedBy: uploader,
      familyId,
    });

    // Index for AI search (non-blocking)
    this.embeddingIndexer?.indexDocument({
      id: document.id,
      name: document.name,
      type: document.type,
      notes: dto.notes,
      familyId,
    }).catch(() => {});

    return document;
  }

  async findAll(familyId: string, userId: string, type?: string) {
    await this.verifyFamilyAccess(familyId, userId);

    const where: any = { familyId };

    if (type) {
      where.type = type;
    }

    return this.prisma.document.findMany({
      where,
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string, userId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: { family: true },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    await this.verifyFamilyAccess(document.familyId, userId);

    return document;
  }

  async update(id: string, userId: string, dto: { name?: string; type?: string; expiresAt?: string; notes?: string }) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const membership = await this.verifyFamilyAccess(document.familyId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot update documents');
    }

    return this.prisma.document.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type as any,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        notes: dto.notes,
      },
    });
  }

  async delete(id: string, userId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const membership = await this.verifyFamilyAccess(document.familyId, userId);

    if (membership.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can delete documents');
    }

    // Get admin info before deletion
    const admin = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });

    const familyId = document.familyId;
    const documentName = document.name;
    const documentType = document.type;

    // Publish event BEFORE deletion for real-time sync
    try {
      await this.eventPublisher.publish(
        ROUTING_KEYS.DOCUMENT_DELETED,
        {
          documentId: id,
          documentName,
          documentType,
          familyId,
          deletedById: userId,
          deletedByName: admin?.fullName || 'Admin',
        },
        { aggregateType: 'Document', aggregateId: id },
        { familyId, causedBy: userId },
      );
    } catch (error) {
      this.logger.warn(`Failed to publish document.deleted event: ${error.message}`);
    }

    // Delete from Cloudinary if file was uploaded (s3Key exists)
    if (document.s3Key) {
      const resourceType = document.mimeType.startsWith('image/')
        ? 'image'
        : document.mimeType.startsWith('video/')
          ? 'video'
          : 'raw';
      await this.storageService.delete(document.s3Key, resourceType);
    }

    await this.prisma.document.delete({
      where: { id },
    });

    // Also emit internal event for local WebSocket broadcast
    this.eventEmitter.emit('document.deleted', {
      documentId: id,
      documentName,
      documentType,
      familyId,
      deletedBy: admin,
    });

    return { success: true };
  }

  async getExpiringDocuments(familyId: string, userId: string, withinDays: number = 30) {
    await this.verifyFamilyAccess(familyId, userId);

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + withinDays);

    return this.prisma.document.findMany({
      where: {
        familyId,
        expiresAt: {
          not: null,
          lte: expirationDate,
        },
      },
      orderBy: { expiresAt: 'asc' },
    });
  }

  async getSignedUrl(documentId: string, familyId: string, userId: string) {
    await this.verifyFamilyAccess(familyId, userId);

    const document = await this.prisma.document.findUnique({
      where: { id: documentId, familyId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Get file extension from mimeType (handle null mimeType)
    const mimeType = document.mimeType || 'application/octet-stream';
    const extension = this.getExtensionFromMimeType(mimeType);
    const filename = `${document.name}${extension}`;

    // Get the base URL
    let baseUrl = document.url;
    if (!baseUrl && document.s3Key) {
      // Legacy fallback: generate URL from s3Key
      baseUrl = await this.storageService.getSignedUrl(document.s3Key, document.mimeType);
    }

    // Handle case where document has no URL (upload may have failed or is pending)
    if (!baseUrl) {
      throw new NotFoundException('Document file not available. The upload may still be processing or failed.');
    }

    // For Cloudinary URLs, create view and download URLs
    // Note: For 'raw' resource type, we cannot append file extensions - Cloudinary treats public_id as exact
    // The frontend handles MIME type via blob creation
    let viewUrl = baseUrl;
    let downloadUrl = baseUrl;

    if (baseUrl.includes('cloudinary.com')) {
      // For download, add fl_attachment flag to force browser download
      // URL format: .../upload/fl_attachment:filename/...
      downloadUrl = baseUrl.replace('/upload/', `/upload/fl_attachment:${encodeURIComponent(filename)}/`);
    }

    return {
      url: viewUrl,
      viewUrl,
      downloadUrl,
      filename,
      mimeType,
    };
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      // Images
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'image/bmp': '.bmp',
      'image/tiff': '.tiff',
      // Documents
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/rtf': '.rtf',
      'text/rtf': '.rtf',
      // Spreadsheets
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      // Presentations
      'application/vnd.ms-powerpoint': '.ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
      // Text files
      'text/plain': '.txt',
      'text/csv': '.csv',
      'text/markdown': '.md',
      'text/x-markdown': '.md',
      // OpenDocument formats
      'application/vnd.oasis.opendocument.text': '.odt',
      'application/vnd.oasis.opendocument.spreadsheet': '.ods',
      'application/vnd.oasis.opendocument.presentation': '.odp',
      // Archives
      'application/zip': '.zip',
      'application/x-rar-compressed': '.rar',
      'application/vnd.rar': '.rar',
      'application/x-7z-compressed': '.7z',
      // Other
      'application/json': '.json',
      'application/xml': '.xml',
      'text/xml': '.xml',
      'text/html': '.html',
    };
    return mimeToExt[mimeType] || '';
  }

  async getByCategory(familyId: string, userId: string) {
    await this.verifyFamilyAccess(familyId, userId);

    const documents = await this.prisma.document.findMany({
      where: { familyId },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
    });

    // Group documents by type
    const grouped: Record<string, any[]> = {};
    for (const doc of documents) {
      const category = doc.type;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(doc);
    }

    return grouped;
  }

}



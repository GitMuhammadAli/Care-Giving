import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../system/module/storage/storage.service';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
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

    return this.prisma.document.create({
      data: {
        familyId,
        uploadedById: userId,
        name: dto.name,
        type: (dto.type as any) || 'OTHER',
        s3Key: file.s3Key,
        url: file.url,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        notes: dto.notes,
      },
    });
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

    // Delete from Cloudinary
    await this.storageService.delete(document.s3Key);

    await this.prisma.document.delete({
      where: { id },
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

    // Get file extension from mimeType
    const extension = this.getExtensionFromMimeType(document.mimeType);
    const filename = `${document.name}${extension}`;

    // Get the base URL
    let baseUrl = document.url;
    if (!baseUrl) {
      // Legacy fallback: generate URL from s3Key
      baseUrl = await this.storageService.getSignedUrl(document.s3Key, document.mimeType);
    }

    // For Cloudinary URLs, create view and download URLs
    // Download URL includes fl_attachment flag to force download
    let viewUrl = baseUrl;
    let downloadUrl = baseUrl;

    if (baseUrl.includes('cloudinary.com')) {
      // Add fl_attachment for download to force browser download with filename
      // URL format: .../upload/fl_attachment:filename/...
      downloadUrl = baseUrl.replace('/upload/', `/upload/fl_attachment:${encodeURIComponent(filename)}/`);
    }

    return {
      url: viewUrl,
      viewUrl,
      downloadUrl,
      filename,
      mimeType: document.mimeType,
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



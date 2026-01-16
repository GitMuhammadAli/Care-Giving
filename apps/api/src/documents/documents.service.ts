import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadDocumentDto } from './dto/upload-document.dto';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  private async verifyFamilyAccess(familyId: string, userId: string) {
    const membership = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this family');
    }

    return membership;
  }

  async create(familyId: string, userId: string, dto: UploadDocumentDto, file: {
    s3Key: string;
    mimeType: string;
    sizeBytes: number;
  }) {
    const membership = await this.verifyFamilyAccess(familyId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot upload documents');
    }

    return this.prisma.document.create({
      data: {
        familyId,
        uploadedById: userId,
        name: dto.name,
        type: dto.type,
        s3Key: file.s3Key,
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

  async update(id: string, userId: string, dto: Partial<UploadDocumentDto>) {
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
        type: dto.type,
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

    // TODO: Delete from S3
    // await this.s3Service.deleteObject(document.s3Key);

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
}


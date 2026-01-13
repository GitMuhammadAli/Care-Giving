import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { v4 as uuid } from 'uuid';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { addDays } from 'date-fns';

@Injectable()
export class DocumentsService {
  private s3: S3Client;
  private bucket: string;
  private encryptionKey: Buffer;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.s3 = new S3Client({
      endpoint: this.config.get('S3_ENDPOINT'),
      region: 'us-east-1',
      credentials: {
        accessKeyId: this.config.get('S3_ACCESS_KEY') || '',
        secretAccessKey: this.config.get('S3_SECRET_KEY') || '',
      },
      forcePathStyle: true, // Required for MinIO
    });

    this.bucket = this.config.get('S3_BUCKET') || 'carecircle-documents';
    
    const key = this.config.get('ENCRYPTION_KEY') || 'dev-encryption-key-32-chars-long!';
    this.encryptionKey = Buffer.from(key, 'utf8').subarray(0, 32);
  }

  private async verifyFamilyAccess(familyId: string, userId: string) {
    const membership = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this family');
    }

    return membership;
  }

  async upload(
    familyId: string,
    userId: string,
    file: Express.Multer.File,
    dto: UploadDocumentDto,
  ) {
    const membership = await this.verifyFamilyAccess(familyId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot upload documents');
    }

    // Encrypt file
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    const encryptedBuffer = Buffer.concat([
      iv,
      cipher.update(file.buffer),
      cipher.final(),
    ]);

    // Upload to S3
    const s3Key = `${familyId}/${uuid()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: encryptedBuffer,
        ContentType: 'application/octet-stream',
        Metadata: {
          originalMimeType: file.mimetype,
          originalName: file.originalname,
        },
      }),
    );

    // Save metadata
    return this.prisma.document.create({
      data: {
        familyId,
        uploadedById: userId,
        name: dto.name || file.originalname,
        type: dto.type,
        s3Key,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        notes: dto.notes,
      },
    });
  }

  async getDownloadUrl(documentId: string, userId: string): Promise<string> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    await this.verifyFamilyAccess(doc.familyId, userId);

    // Generate presigned URL
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: doc.s3Key,
    });

    return getSignedUrl(this.s3, command, { expiresIn: 3600 }); // 1 hour
  }

  async list(familyId: string, userId: string, type?: string) {
    await this.verifyFamilyAccess(familyId, userId);

    return this.prisma.document.findMany({
      where: {
        familyId,
        ...(type && { type: type as any }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getExpiringDocuments(familyId: string, userId: string, daysAhead: number = 30) {
    await this.verifyFamilyAccess(familyId, userId);

    const futureDate = addDays(new Date(), daysAhead);

    return this.prisma.document.findMany({
      where: {
        familyId,
        expiresAt: {
          lte: futureDate,
          gte: new Date(),
        },
      },
      orderBy: { expiresAt: 'asc' },
    });
  }

  async delete(documentId: string, userId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    const membership = await this.verifyFamilyAccess(doc.familyId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot delete documents');
    }

    // Delete from S3
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: doc.s3Key,
      }),
    );

    // Delete from database
    await this.prisma.document.delete({
      where: { id: documentId },
    });

    return { success: true };
  }

  async update(documentId: string, userId: string, data: { name?: string; notes?: string; expiresAt?: string }) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    const membership = await this.verifyFamilyAccess(doc.familyId, userId);

    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot update documents');
    }

    return this.prisma.document.update({
      where: { id: documentId },
      data: {
        name: data.name,
        notes: data.notes,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
    });
  }
}


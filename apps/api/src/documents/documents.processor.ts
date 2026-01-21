import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../system/module/storage/storage.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface DocumentUploadJob {
  documentId: string;
  familyId: string;
  userId: string;
  file: {
    buffer: string; // Base64 encoded
    originalname: string;
    mimetype: string;
    size: number;
  };
}

@Processor('document-upload')
export class DocumentsProcessor {
  private readonly logger = new Logger(DocumentsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Process('upload')
  async handleUpload(job: Job<DocumentUploadJob>) {
    const { documentId, familyId, file } = job.data;

    this.logger.log(`Processing document upload: ${documentId}`);

    try {
      // Convert base64 back to buffer
      const buffer = Buffer.from(file.buffer, 'base64');

      // Create a file-like object for the storage service
      const fileObj = {
        buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      } as Express.Multer.File;

      // Determine resource type based on mimeType
      let resourceType: 'image' | 'raw' | 'video' | 'auto' = 'raw';
      if (file.mimetype.startsWith('image/')) {
        resourceType = 'image';
      } else if (file.mimetype.startsWith('video/')) {
        resourceType = 'video';
      }

      // Upload file to Cloudinary
      const uploadResult = await this.storageService.upload(fileObj, {
        folder: `carecircle/documents/${familyId}`,
        resourceType,
      });

      // Update the document record with the storage info
      const document = await this.prisma.document.update({
        where: { id: documentId },
        data: {
          s3Key: uploadResult.key,
          url: uploadResult.url,
          status: 'READY',
        },
      });

      this.logger.log(`Document upload complete: ${documentId}`);

      // Emit event for real-time notification
      this.eventEmitter.emit('document.uploaded', {
        documentId,
        familyId,
        document,
      });

      return { success: true, documentId };
    } catch (error) {
      this.logger.error(`Document upload failed: ${documentId}`, error);

      // Update document status to failed
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'FAILED',
        },
      });

      // Emit failure event
      this.eventEmitter.emit('document.upload.failed', {
        documentId,
        familyId,
        error: error.message,
      });

      throw error;
    }
  }
}

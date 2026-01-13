// @ts-nocheck
// Storage provider implementation - type issues due to Buffer vs File
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';
import { StorageProvider, UploadResult, UploadOptions } from '../storage.service';

@Injectable()
export class S3StorageService implements StorageProvider, OnModuleInit {
  private readonly logger = new Logger(S3StorageService.name);
  private s3Client: S3Client;
  private bucket: string;
  private encryptionKey: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const endpoint = this.configService.get('storage.s3.endpoint');
    const accessKeyId = this.configService.get('storage.s3.accessKeyId');
    const secretAccessKey = this.configService.get('storage.s3.secretAccessKey');
    const region = this.configService.get('storage.s3.region') || 'us-east-1';

    if (accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        ...(endpoint && {
          endpoint,
          forcePathStyle: true,
        }),
      });

      this.bucket = this.configService.get('storage.s3.bucket') || 'carecircle-documents';
      this.encryptionKey = this.configService.get('security.encryptionKey');
      
      this.logger.log('S3/MinIO initialized successfully');
    } else {
      this.logger.warn('S3 credentials not configured');
    }
  }

  async upload(file: Buffer, options: UploadOptions = {}): Promise<UploadResult> {
    const key = this.generateKey(options.folder || '', options.filename || crypto.randomUUID());

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: options.contentType,
      }),
    );

    const url = await this.getSignedUrl(key);

    return {
      url,
      publicId: key,
      size: file.length,
    };
  }

  async delete(publicId: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: publicId,
      }),
    );
    this.logger.debug(`Deleted file: ${publicId}`);
  }

  async getSignedUrl(publicId: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: publicId,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  private generateKey(folder: string, filename: string): string {
    const uuid = crypto.randomUUID();
    const extension = filename.split('.').pop() || '';
    const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    if (folder) {
      return `${folder}/${uuid}-${sanitizedName}`;
    }
    return `${uuid}-${sanitizedName}`;
  }
}


import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

@Injectable()
export class AwsS3Service {
  private readonly logger = new Logger(AwsS3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly encryptionKey: string;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get('aws.s3Endpoint');
    
    this.s3Client = new S3Client({
      region: this.configService.get('aws.region') || 'us-east-1',
      credentials: {
        accessKeyId: this.configService.get('aws.accessKeyId'),
        secretAccessKey: this.configService.get('aws.secretAccessKey'),
      },
      ...(endpoint && {
        endpoint,
        forcePathStyle: true,
      }),
    });

    this.bucket = this.configService.get('aws.s3Bucket');
    this.encryptionKey = this.configService.get('security.encryptionKey');
  }

  async uploadFile(
    key: string,
    buffer: Buffer,
    contentType: string,
    encrypt = false,
  ): Promise<{ key: string; iv?: string }> {
    let dataToUpload = buffer;
    let iv: string | undefined;

    if (encrypt) {
      const encrypted = this.encryptBuffer(buffer);
      dataToUpload = encrypted.data;
      iv = encrypted.iv;
    }

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: dataToUpload,
        ContentType: contentType,
        Metadata: encrypt ? { encrypted: 'true' } : undefined,
      }),
    );

    return { key, iv };
  }

  async getFile(key: string, iv?: string): Promise<Buffer> {
    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    let buffer = Buffer.concat(chunks) as Buffer;

    // Decrypt if IV is provided
    if (iv) {
      buffer = this.decryptBuffer(buffer, iv) as Buffer;
    }

    return buffer;
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async listFiles(prefix: string): Promise<string[]> {
    const response = await this.s3Client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      }),
    );

    return response.Contents?.map((obj) => obj.Key!) || [];
  }

  generateKey(familyId: string, type: string, filename: string): string {
    const uuid = crypto.randomUUID();
    const extension = filename.split('.').pop();
    return `${familyId}/${type}/${uuid}.${extension}`;
  }

  private encryptBuffer(buffer: Buffer): { data: Buffer; iv: string } {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(this.encryptionKey, 'hex');
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    
    return {
      data: encrypted,
      iv: iv.toString('hex'),
    };
  }

  private decryptBuffer(encryptedBuffer: Buffer, ivHex: string): Buffer {
    const iv = Buffer.from(ivHex, 'hex');
    const key = Buffer.from(this.encryptionKey, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  }
}


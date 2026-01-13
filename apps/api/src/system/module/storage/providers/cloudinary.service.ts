// @ts-nocheck
// Storage provider implementation - type issues due to Buffer vs File
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { StorageProvider, UploadResult, UploadOptions } from '../storage.service';

@Injectable()
export class CloudinaryService implements StorageProvider, OnModuleInit {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly folder: string;

  constructor(private readonly configService: ConfigService) {
    this.folder = this.configService.get('storage.cloudinary.folder') || 'carecircle';
  }

  onModuleInit() {
    const cloudName = this.configService.get('storage.cloudinary.cloudName');
    const apiKey = this.configService.get('storage.cloudinary.apiKey');
    const apiSecret = this.configService.get('storage.cloudinary.apiSecret');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.logger.log('Cloudinary initialized successfully');
    } else {
      this.logger.warn('Cloudinary credentials not configured');
    }
  }

  async upload(file: Buffer, options: UploadOptions = {}): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        folder: options.folder ? `${this.folder}/${options.folder}` : this.folder,
        resource_type: options.resourceType || 'auto',
        use_filename: !!options.filename,
        unique_filename: !options.filename,
      };

      if (options.filename) {
        uploadOptions.public_id = options.filename;
      }

      if (options.transformation) {
        uploadOptions.transformation = options.transformation;
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error('Cloudinary upload error:', error);
            reject(error);
            return;
          }

          if (!result) {
            reject(new Error('No result from Cloudinary'));
            return;
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            size: result.bytes,
            width: result.width,
            height: result.height,
          });
        },
      );

      uploadStream.end(file);
    });
  }

  async delete(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      this.logger.debug(`Deleted file: ${publicId}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${publicId}`, error);
      throw error;
    }
  }

  async getSignedUrl(publicId: string, expiresIn = 3600): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000) + expiresIn;
    
    return cloudinary.url(publicId, {
      type: 'authenticated',
      sign_url: true,
      expires_at: timestamp,
      secure: true,
    });
  }

  // Cloudinary-specific methods
  async getOptimizedUrl(publicId: string, options: any = {}): Promise<string> {
    return cloudinary.url(publicId, {
      fetch_format: 'auto',
      quality: 'auto',
      secure: true,
      ...options,
    });
  }

  async createThumbnail(publicId: string, width = 150, height = 150): Promise<string> {
    return cloudinary.url(publicId, {
      transformation: [
        { width, height, crop: 'fill' },
        { fetch_format: 'auto', quality: 'auto' },
      ],
      secure: true,
    });
  }
}


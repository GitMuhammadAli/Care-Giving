import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { v4 as uuid } from 'uuid';

export interface UploadOptions {
  folder?: string;
  resourceType?: 'image' | 'raw' | 'video' | 'auto';
  filename?: string;
  transformation?: any;
  contentType?: string;
}

export interface StorageProvider {
  upload(file: Express.Multer.File, options?: UploadOptions): Promise<UploadResult>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
}

export interface UploadResult {
  url: string;
  key: string;
  publicId: string;
  format?: string;
  size?: number;
}

@Injectable()
export class StorageService {
  private readonly provider: string;
  private readonly cloudinaryConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const storageConfig = this.configService.get('storage');
    this.provider = storageConfig?.provider || 'cloudinary';

    // Configure Cloudinary if selected
    if (this.provider === 'cloudinary') {
      const cloudinaryConfig = storageConfig?.cloudinary;
      const cloudinaryUrl = cloudinaryConfig?.url;

      if (cloudinaryUrl) {
        cloudinary.config({ secure: true });
        this.cloudinaryConfigured = true;
      } else if (cloudinaryConfig?.cloudName && cloudinaryConfig?.apiKey && cloudinaryConfig?.apiSecret) {
        cloudinary.config({
          cloud_name: cloudinaryConfig.cloudName,
          api_key: cloudinaryConfig.apiKey,
          api_secret: cloudinaryConfig.apiSecret,
          secure: true,
        });
        this.cloudinaryConfigured = true;
      } else {
        this.cloudinaryConfigured = false;
      }
    } else {
      this.cloudinaryConfigured = false;
    }
  }

  async upload(
    file: Express.Multer.File,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    if (!this.cloudinaryConfigured) {
      // Fallback to local storage for dev
      return this.uploadLocal(file, options);
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder || 'carecircle',
          resource_type: options.resourceType || 'auto',
          public_id: uuid(),
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve({
              url: result.secure_url,
              key: result.public_id,
              publicId: result.public_id,
            });
          }
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async delete(key: string): Promise<void> {
    if (!this.cloudinaryConfigured) {
      // Local storage deletion
      return;
    }

    await cloudinary.uploader.destroy(key);
  }

  async getSignedUrl(key: string, mimeType?: string): Promise<string> {
    if (!this.cloudinaryConfigured) {
      // Return local URL
      return `/uploads/${key}`;
    }

    // Determine resource type from mimeType
    let resourceType: 'image' | 'video' | 'raw' = 'raw';
    if (mimeType) {
      if (mimeType.startsWith('image/')) {
        resourceType = 'image';
      } else if (mimeType.startsWith('video/')) {
        resourceType = 'video';
      }
    }

    // Return the public Cloudinary URL
    return cloudinary.url(key, {
      secure: true,
      resource_type: resourceType,
    });
  }

  private async uploadLocal(
    file: Express.Multer.File,
    options: UploadOptions,
  ): Promise<UploadResult> {
    // For development without Cloudinary
    // In production, you should always use a cloud storage provider
    const key = `${options.folder || 'uploads'}/${uuid()}-${file.originalname}`;
    
    // In a real implementation, you would write to local filesystem
    // For now, we'll just return a mock URL
    return {
      url: `/uploads/${key}`,
      key,
      publicId: key,
    };
  }
}

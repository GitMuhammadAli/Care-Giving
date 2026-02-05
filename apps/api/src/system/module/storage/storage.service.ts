import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { v4 as uuid } from 'uuid';
import { LimitsService, ResourceType, PeriodType, RESOURCE_LIMITS } from '../limits';

export interface UploadOptions {
  folder?: string;
  resourceType?: 'image' | 'raw' | 'video' | 'auto';
  filename?: string;
  transformation?: any;
  contentType?: string;
  skipLimitCheck?: boolean; // For system uploads
  skipMimeValidation?: boolean; // For trusted system uploads
}

// SECURITY: Whitelist of allowed MIME types for file uploads
const ALLOWED_MIME_TYPES = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  // Videos (for care documentation)
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/quicktime': ['.mov'],
  // Audio (for voice notes)
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/webm': ['.weba'],
};

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
  private readonly logger = new Logger(StorageService.name);
  private readonly provider: string;
  private readonly cloudinaryConfigured: boolean;
  private readonly maxFileSizeBytes: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly limitsService: LimitsService,
  ) {
    const storageConfig = this.configService.get('storage');
    this.provider = storageConfig?.provider || 'cloudinary';
    this.maxFileSizeBytes = RESOURCE_LIMITS.MAX_FILE_SIZE_BYTES.limit;

    // Configure Cloudinary if selected
    if (this.provider === 'cloudinary') {
      const cloudinaryConfig = storageConfig?.cloudinary;
      const cloudinaryUrl = cloudinaryConfig?.url;

      if (cloudinaryUrl) {
        // Parse CLOUDINARY_URL format: cloudinary://api_key:api_secret@cloud_name
        // The cloudinary library can use this directly
        process.env.CLOUDINARY_URL = cloudinaryUrl;
        cloudinary.config({ secure: true });
        this.cloudinaryConfigured = true;
        // Log the cloud name to verify config is correct
        const config = cloudinary.config();
        this.logger.log(`Cloudinary configured via URL, cloud_name: ${config.cloud_name}`);
      } else if (cloudinaryConfig?.cloudName && cloudinaryConfig?.apiKey && cloudinaryConfig?.apiSecret) {
        cloudinary.config({
          cloud_name: cloudinaryConfig.cloudName,
          api_key: cloudinaryConfig.apiKey,
          api_secret: cloudinaryConfig.apiSecret,
          secure: true,
        });
        this.cloudinaryConfigured = true;
        this.logger.log('Cloudinary configured via credentials');
      } else {
        this.cloudinaryConfigured = false;
        this.logger.warn('Cloudinary NOT configured - missing credentials');
      }
    } else {
      this.cloudinaryConfigured = false;
    }
  }

  async upload(
    file: Express.Multer.File,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    this.logger.debug(`Upload called: filename=${file.originalname}, mimetype=${file.mimetype}, size=${file.size}`);

    // SECURITY: Validate MIME type against whitelist
    if (!options.skipMimeValidation) {
      const allowedTypes = Object.keys(ALLOWED_MIME_TYPES);
      if (!allowedTypes.includes(file.mimetype)) {
        this.logger.warn(`Rejected file upload with disallowed MIME type: ${file.mimetype}`);
        throw new BadRequestException(
          `File type '${file.mimetype}' is not allowed. Allowed types: images, PDF, Word, Excel, text, video, and audio files.`,
        );
      }

      // Additional check: verify extension matches MIME type
      const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
      const allowedExtensions = ALLOWED_MIME_TYPES[file.mimetype as keyof typeof ALLOWED_MIME_TYPES];
      if (allowedExtensions && !allowedExtensions.includes(ext)) {
        this.logger.warn(`File extension ${ext} doesn't match MIME type ${file.mimetype}`);
        throw new BadRequestException(
          `File extension doesn't match the file type. This may indicate a potentially malicious file.`,
        );
      }
    }

    // Check file size limit
    if (file.size > this.maxFileSizeBytes) {
      const maxSizeMB = Math.round(this.maxFileSizeBytes / (1024 * 1024));
      throw new BadRequestException(
        `File size (${Math.round(file.size / (1024 * 1024))}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
      );
    }

    // Check upload count limits (unless skipped for system uploads)
    if (!options.skipLimitCheck) {
      const { allowed, status } = await this.limitsService.checkLimit(
        ResourceType.FILE_UPLOADS,
        PeriodType.MONTHLY,
        1,
      );

      if (!allowed) {
        this.logger.error(
          `Monthly upload limit reached (${status.count}/${status.limit}). Upload blocked.`,
        );
        throw new BadRequestException(
          'Monthly file upload limit reached. Please contact support or wait until next month.',
        );
      }

      if (status.isWarning) {
        this.logger.warn(
          `File upload usage warning: ${status.count}/${status.limit} (${status.percentUsed}%)`,
        );
      }
    }

    if (!this.cloudinaryConfigured) {
      this.logger.debug('Cloudinary not configured, using local fallback');
      return this.uploadLocal(file, options);
    }

    // Use original filename (sanitized) with timestamp for uniqueness
    // This makes files more identifiable in Cloudinary dashboard
    const sanitizedName = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
      .replace(/_{2,}/g, '_'); // Remove multiple consecutive underscores
    const timestamp = Date.now();
    const publicId = `${timestamp}_${sanitizedName}`;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder || 'carecircle',
          resource_type: options.resourceType || 'auto',
          public_id: publicId,
          // Use regular 'upload' type (not 'authenticated' which is restricted)
        },
        async (error, result) => {
          if (error) {
            this.logger.error(`Cloudinary upload error: ${error.message}`);
            reject(error);
          } else if (result) {
            // Track successful upload
            if (!options.skipLimitCheck) {
              await this.limitsService.incrementUsage(
                ResourceType.FILE_UPLOADS,
                PeriodType.MONTHLY,
                1,
              );
            }

            this.logger.debug(`Cloudinary upload success: publicId=${result.public_id}, format=${result.format}`);
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

  async delete(key: string, resourceType: 'image' | 'raw' | 'video' = 'raw'): Promise<void> {
    if (!this.cloudinaryConfigured) {
      // Local storage deletion
      return;
    }

    this.logger.debug(`Deleting from Cloudinary: key=${key}, resourceType=${resourceType}`);
    const result = await cloudinary.uploader.destroy(key, {
      resource_type: resourceType,
    });
    this.logger.debug(`Delete result: ${JSON.stringify(result)}`);
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
    // Make sure "Allow delivery of PDF and ZIP files" is enabled in Cloudinary settings
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

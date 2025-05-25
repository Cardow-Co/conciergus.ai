/**
 * File Attachment and Security System
 *
 * This module provides comprehensive file attachment capabilities including
 * file validation, security scanning, storage management, thumbnail generation,
 * and download handling for the multi-agent chat system.
 */

import type { ContentAttachment } from '../components/MessageFormatting';

/**
 * File validation configuration
 */
export interface FileValidationConfig {
  maxFileSize: number; // in bytes
  maxTotalSize: number; // total size for all files
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  blockedMimeTypes: string[];
  blockedExtensions: string[];
  enableVirusScanning: boolean;
  enableContentValidation: boolean;
  maxFileCount: number;
}

/**
 * File validation result
 */
export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo: {
    name: string;
    size: number;
    type: string;
    extension: string;
    hash?: string;
  };
  securityScan?: {
    isClean: boolean;
    threats: string[];
    scanProvider: string;
    scanTimestamp: Date;
  };
}

/**
 * File upload progress information
 */
export interface FileUploadProgress {
  fileId: string;
  fileName: string;
  totalBytes: number;
  uploadedBytes: number;
  percentage: number;
  speed: number; // bytes per second
  remainingTime: number; // seconds
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

/**
 * File storage configuration
 */
export interface FileStorageConfig {
  provider: 'local' | 'supabase' | 's3' | 'cloudinary';
  bucket?: string;
  basePath?: string;
  generateThumbnails: boolean;
  thumbnailSizes: { width: number; height: number; quality: number }[];
  enableCDN: boolean;
  cdnUrl?: string;
  signedUrlExpiry: number; // seconds
}

/**
 * Default file validation configuration
 */
export const DEFAULT_FILE_CONFIG: FileValidationConfig = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxTotalSize: 200 * 1024 * 1024, // 200MB
  allowedMimeTypes: [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Documents
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Audio/Video
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'video/mp4',
    'video/webm',
    'video/ogg',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/gzip',
    // Code files
    'text/javascript',
    'text/typescript',
    'text/css',
    'text/html',
    'application/json',
  ],
  allowedExtensions: [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.svg',
    '.pdf',
    '.txt',
    '.md',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.mp3',
    '.wav',
    '.ogg',
    '.mp4',
    '.webm',
    '.ogv',
    '.zip',
    '.rar',
    '.gz',
    '.js',
    '.ts',
    '.css',
    '.html',
    '.json',
  ],
  blockedMimeTypes: [
    'application/x-executable',
    'application/x-msdownload',
    'application/x-dosexec',
  ],
  blockedExtensions: [
    '.exe',
    '.scr',
    '.bat',
    '.cmd',
    '.com',
    '.pif',
    '.vbs',
    '.js',
  ],
  enableVirusScanning: true,
  enableContentValidation: true,
  maxFileCount: 10,
};

/**
 * File validation utilities
 */
export class FileValidator {
  private config: FileValidationConfig;

  constructor(config: Partial<FileValidationConfig> = {}) {
    this.config = { ...DEFAULT_FILE_CONFIG, ...config };
  }

  /**
   * Validate a single file
   */
  async validateFile(file: File): Promise<FileValidationResult> {
    const result: FileValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type,
        extension: this.getFileExtension(file.name),
      },
    };

    // Basic validation
    if (!this.validateFileSize(file, result)) return result;
    if (!this.validateMimeType(file, result)) return result;
    if (!this.validateExtension(file, result)) return result;
    if (!this.validateFileName(file, result)) return result;

    // Content validation
    if (this.config.enableContentValidation) {
      await this.validateFileContent(file, result);
    }

    // Security scanning
    if (this.config.enableVirusScanning) {
      await this.performSecurityScan(file, result);
    }

    // Generate file hash
    result.fileInfo.hash = await this.generateFileHash(file);

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate multiple files
   */
  async validateFiles(files: FileList | File[]): Promise<{
    results: FileValidationResult[];
    isValid: boolean;
    totalSize: number;
    errors: string[];
  }> {
    const fileArray = Array.from(files);
    const results: FileValidationResult[] = [];
    const errors: string[] = [];
    let totalSize = 0;

    // Check file count
    if (fileArray.length > this.config.maxFileCount) {
      errors.push(`Maximum ${this.config.maxFileCount} files allowed`);
    }

    // Validate each file
    for (const file of fileArray) {
      const result = await this.validateFile(file);
      results.push(result);
      totalSize += file.size;

      if (!result.isValid) {
        errors.push(...result.errors.map((err) => `${file.name}: ${err}`));
      }
    }

    // Check total size
    if (totalSize > this.config.maxTotalSize) {
      errors.push(
        `Total file size (${this.formatFileSize(totalSize)}) exceeds limit (${this.formatFileSize(this.config.maxTotalSize)})`
      );
    }

    return {
      results,
      isValid: errors.length === 0,
      totalSize,
      errors,
    };
  }

  private validateFileSize(file: File, result: FileValidationResult): boolean {
    if (file.size > this.config.maxFileSize) {
      result.errors.push(
        `File size (${this.formatFileSize(file.size)}) exceeds limit (${this.formatFileSize(this.config.maxFileSize)})`
      );
      return false;
    }
    return true;
  }

  private validateMimeType(file: File, result: FileValidationResult): boolean {
    if (this.config.blockedMimeTypes.includes(file.type)) {
      result.errors.push(`File type ${file.type} is not allowed`);
      return false;
    }

    if (
      this.config.allowedMimeTypes.length > 0 &&
      !this.config.allowedMimeTypes.includes(file.type)
    ) {
      result.errors.push(`File type ${file.type} is not supported`);
      return false;
    }

    return true;
  }

  private validateExtension(file: File, result: FileValidationResult): boolean {
    const extension = this.getFileExtension(file.name);

    if (this.config.blockedExtensions.includes(extension)) {
      result.errors.push(`File extension ${extension} is not allowed`);
      return false;
    }

    if (
      this.config.allowedExtensions.length > 0 &&
      !this.config.allowedExtensions.includes(extension)
    ) {
      result.errors.push(`File extension ${extension} is not supported`);
      return false;
    }

    return true;
  }

  private validateFileName(file: File, result: FileValidationResult): boolean {
    // Check for dangerous file names
    const dangerousPatterns = [
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i, // Windows reserved names
      /[<>:"|?*]/, // Invalid characters
      /^\s|\s$/, // Leading/trailing spaces
      /\.{2,}/, // Multiple dots
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(file.name)) {
        result.errors.push('Invalid file name');
        return false;
      }
    }

    return true;
  }

  private async validateFileContent(
    file: File,
    result: FileValidationResult
  ): Promise<void> {
    try {
      // Basic content validation - check if file actually matches its claimed type
      const buffer = await file.slice(0, 512).arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      // Check file signatures (magic numbers)
      const signatures = this.getFileSignatures();
      const actualType = this.detectFileType(uint8Array, signatures);

      if (actualType && actualType !== file.type) {
        result.warnings.push(
          `File content doesn't match declared type. Expected: ${file.type}, Detected: ${actualType}`
        );
      }
    } catch (error) {
      result.warnings.push('Could not validate file content');
    }
  }

  private async performSecurityScan(
    file: File,
    result: FileValidationResult
  ): Promise<void> {
    // Placeholder for virus scanning integration
    // In production, integrate with services like ClamAV, VirusTotal, etc.

    try {
      // Simulate security scan
      const isClean = await this.simulateVirusScan(file);

      result.securityScan = {
        isClean,
        threats: isClean ? [] : ['Potential threat detected'],
        scanProvider: 'MockScanner',
        scanTimestamp: new Date(),
      };

      if (!isClean) {
        result.errors.push('Security scan failed - file may contain threats');
      }
    } catch (error) {
      result.warnings.push('Could not perform security scan');
    }
  }

  private async simulateVirusScan(file: File): Promise<boolean> {
    // Simple simulation - in production, call actual virus scanning service
    return new Promise((resolve) => {
      setTimeout(() => {
        // For demo purposes, assume files are clean
        resolve(true);
      }, Math.random() * 1000);
    });
  }

  private async generateFileHash(file: File): Promise<string> {
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      return 'hash-error';
    }
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.slice(lastDot).toLowerCase();
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  private getFileSignatures(): Record<string, number[]> {
    return {
      'image/jpeg': [0xff, 0xd8, 0xff],
      'image/png': [0x89, 0x50, 0x4e, 0x47],
      'image/gif': [0x47, 0x49, 0x46],
      'application/pdf': [0x25, 0x50, 0x44, 0x46],
      'application/zip': [0x50, 0x4b, 0x03, 0x04],
    };
  }

  private detectFileType(
    uint8Array: Uint8Array,
    signatures: Record<string, number[]>
  ): string | null {
    for (const [mimeType, signature] of Object.entries(signatures)) {
      if (signature.every((byte, index) => uint8Array[index] === byte)) {
        return mimeType;
      }
    }
    return null;
  }
}

/**
 * File upload manager
 */
export class FileUploadManager {
  private storageConfig: FileStorageConfig;
  private validator: FileValidator;
  private activeUploads = new Map<string, FileUploadProgress>();

  constructor(
    storageConfig: Partial<FileStorageConfig> = {},
    validationConfig: Partial<FileValidationConfig> = {}
  ) {
    this.storageConfig = {
      provider: 'supabase',
      generateThumbnails: true,
      thumbnailSizes: [
        { width: 150, height: 150, quality: 80 },
        { width: 300, height: 300, quality: 85 },
        { width: 800, height: 600, quality: 90 },
      ],
      enableCDN: true,
      signedUrlExpiry: 3600,
      ...storageConfig,
    };

    this.validator = new FileValidator(validationConfig);
  }

  /**
   * Upload files with progress tracking
   */
  async uploadFiles(
    files: FileList | File[],
    onProgress?: (progress: FileUploadProgress[]) => void
  ): Promise<ContentAttachment[]> {
    const fileArray = Array.from(files);

    // Validate files first
    const validation = await this.validator.validateFiles(fileArray);
    if (!validation.isValid) {
      throw new Error(
        `File validation failed: ${validation.errors.join(', ')}`
      );
    }

    const attachments: ContentAttachment[] = [];
    const progressList: FileUploadProgress[] = [];

    // Initialize progress tracking
    for (const file of fileArray) {
      const fileId = this.generateFileId();
      const progress: FileUploadProgress = {
        fileId,
        fileName: file.name,
        totalBytes: file.size,
        uploadedBytes: 0,
        percentage: 0,
        speed: 0,
        remainingTime: 0,
        status: 'pending',
      };

      this.activeUploads.set(fileId, progress);
      progressList.push(progress);
    }

    try {
      // Upload files concurrently
      const uploadPromises = fileArray.map(async (file, index) => {
        const progress = progressList[index];
        progress.status = 'uploading';

        const attachment = await this.uploadSingleFile(file, (uploaded) => {
          progress.uploadedBytes = uploaded;
          progress.percentage = (uploaded / file.size) * 100;
          progress.speed = this.calculateUploadSpeed(progress);
          progress.remainingTime = this.calculateRemainingTime(progress);

          onProgress?.(progressList);
        });

        progress.status = 'processing';
        onProgress?.(progressList);

        // Generate thumbnails if needed
        if (
          this.storageConfig.generateThumbnails &&
          file.type.startsWith('image/')
        ) {
          attachment.thumbnail = await this.generateThumbnail(
            file,
            attachment.url
          );
        }

        progress.status = 'complete';
        onProgress?.(progressList);

        return attachment;
      });

      const results = await Promise.all(uploadPromises);
      attachments.push(...results);
    } catch (error) {
      // Mark failed uploads
      progressList.forEach((progress) => {
        if (progress.status !== 'complete') {
          progress.status = 'error';
          progress.error =
            error instanceof Error ? error.message : 'Upload failed';
        }
      });
      onProgress?.(progressList);
      throw error;
    } finally {
      // Cleanup
      progressList.forEach((progress) => {
        this.activeUploads.delete(progress.fileId);
      });
    }

    return attachments;
  }

  private async uploadSingleFile(
    file: File,
    onProgress: (uploaded: number) => void
  ): Promise<ContentAttachment> {
    // This would integrate with your storage provider (Supabase, S3, etc.)
    // For now, we'll simulate the upload process

    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      let uploaded = 0;

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        uploaded += Math.random() * 1024 * 1024; // Random chunk size
        if (uploaded > file.size) {
          uploaded = file.size;
          clearInterval(progressInterval);

          // Generate attachment object
          const attachment: ContentAttachment = {
            id: this.generateFileId(),
            type: this.getAttachmentType(file.type),
            url: URL.createObjectURL(file), // In production, this would be the uploaded URL
            title: file.name,
            size: file.size,
            mimeType: file.type,
            metadata: {
              uploadedAt: new Date().toISOString(),
              hash: 'file-hash-here',
            },
          };

          resolve(attachment);
        } else {
          onProgress(uploaded);
        }
      }, 100);

      fileReader.onerror = () => {
        clearInterval(progressInterval);
        reject(new Error('Failed to read file'));
      };
    });
  }

  private async generateThumbnail(
    file: File,
    originalUrl: string
  ): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const size = this.storageConfig.thumbnailSizes[0];
        canvas.width = size.width;
        canvas.height = size.height;

        ctx?.drawImage(img, 0, 0, size.width, size.height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(URL.createObjectURL(blob));
            } else {
              resolve(originalUrl);
            }
          },
          'image/jpeg',
          size.quality / 100
        );
      };

      img.onerror = () => resolve(originalUrl);
      img.src = originalUrl;
    });
  }

  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getAttachmentType(mimeType: string): ContentAttachment['type'] {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'file';
  }

  private calculateUploadSpeed(progress: FileUploadProgress): number {
    // Simple speed calculation - in production, use a moving average
    return progress.uploadedBytes / 1024; // KB/s
  }

  private calculateRemainingTime(progress: FileUploadProgress): number {
    if (progress.speed === 0) return 0;
    return (
      (progress.totalBytes - progress.uploadedBytes) / (progress.speed * 1024)
    );
  }

  /**
   * Get upload progress for active uploads
   */
  getActiveUploads(): FileUploadProgress[] {
    return Array.from(this.activeUploads.values());
  }

  /**
   * Cancel an active upload
   */
  cancelUpload(fileId: string): boolean {
    return this.activeUploads.delete(fileId);
  }
}

// Export factory functions for easy integration
export function createFileValidator(
  config?: Partial<FileValidationConfig>
): FileValidator {
  return new FileValidator(config);
}

export function createFileUploadManager(
  storageConfig?: Partial<FileStorageConfig>,
  validationConfig?: Partial<FileValidationConfig>
): FileUploadManager {
  return new FileUploadManager(storageConfig, validationConfig);
}

export default {
  FileValidator,
  FileUploadManager,
  createFileValidator,
  createFileUploadManager,
  DEFAULT_FILE_CONFIG,
};

/**
 * Asset Optimizer
 * Comprehensive asset optimization for CDN delivery and performance
 */

import { EventEmitter } from 'events';
import { PerformanceMonitor } from '../telemetry/PerformanceMonitor';

/**
 * Supported image formats for optimization
 */
export type ImageFormat = 'webp' | 'avif' | 'jpeg' | 'png' | 'svg';

/**
 * CDN providers
 */
export type CDNProvider = 'cloudflare' | 'aws-cloudfront' | 'vercel' | 'netlify' | 'custom';

/**
 * Asset types
 */
export type AssetType = 'image' | 'font' | 'css' | 'js' | 'audio' | 'video' | 'document';

/**
 * Asset optimization configuration
 */
export interface AssetOptimizationConfig {
  // CDN configuration
  cdn: {
    provider: CDNProvider;
    domain: string;
    zone?: string;
    apiKey?: string;
    enabled: boolean;
  };

  // Image optimization
  images: {
    enableOptimization: boolean;
    enableNextGenFormats: boolean; // WebP, AVIF
    quality: {
      jpeg: number;
      webp: number;
      avif: number;
      png: number;
    };
    enableLazyLoading: boolean;
    enableResponsive: boolean;
    breakpoints: number[];
    enableBlur: boolean; // Placeholder blur
  };

  // Asset versioning and caching
  caching: {
    enableVersioning: boolean;
    versionStrategy: 'hash' | 'timestamp' | 'semver';
    cacheHeaders: {
      immutable: boolean;
      maxAge: number;
      staleWhileRevalidate: number;
    };
    enablePreload: boolean;
    enablePrefetch: boolean;
  };

  // Compression
  compression: {
    enableGzip: boolean;
    enableBrotli: boolean;
    compressionLevel: number;
  };

  // Performance monitoring
  monitoring: {
    enableMetrics: boolean;
    trackLoadTimes: boolean;
    enableCoreWebVitals: boolean;
  };
}

/**
 * Asset information
 */
export interface AssetInfo {
  url: string;
  type: AssetType;
  size: number;
  optimizedSize?: number;
  format: string;
  optimizedFormat?: string;
  version?: string;
  cacheStatus: 'hit' | 'miss' | 'unknown';
  loadTime?: number;
  cacheHeaders?: Record<string, string>;
}

/**
 * Image optimization options
 */
export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: ImageFormat;
  fit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  enableBlur?: boolean;
  enableLazyLoading?: boolean;
}

/**
 * Asset preload options
 */
export interface AssetPreloadOptions {
  as: 'image' | 'font' | 'script' | 'style' | 'audio' | 'video';
  crossorigin?: 'anonymous' | 'use-credentials';
  media?: string;
  type?: string;
}

/**
 * CDN performance metrics
 */
export interface CDNMetrics {
  totalAssets: number;
  totalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  averageLoadTime: number;
  cacheHitRate: number;
  bandwidthSaved: number;
  coreWebVitals: {
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
  };
}

/**
 * Asset Optimizer Implementation
 */
export class AssetOptimizer extends EventEmitter {
  private config: AssetOptimizationConfig;
  private performanceMonitor: PerformanceMonitor | null = null;
  private assetCache = new Map<string, AssetInfo>();
  private loadTimeCache = new Map<string, number[]>();
  private observer: PerformanceObserver | null = null;

  constructor(config: AssetOptimizationConfig) {
    super();
    this.config = config;
    this.performanceMonitor = PerformanceMonitor.getInstance();
    
    if (this.config.monitoring.enableMetrics) {
      this.initializeMonitoring();
    }
  }

  /**
   * Initialize performance monitoring
   */
  private initializeMonitoring(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        for (const entry of entries) {
          if (entry.entryType === 'resource') {
            this.recordAssetLoadTime(entry as PerformanceResourceTiming);
          } else if (entry.entryType === 'largest-contentful-paint') {
            this.recordCoreWebVital('lcp', entry.startTime);
          } else if (entry.entryType === 'first-input') {
            this.recordCoreWebVital('fid', (entry as any).processingStart - entry.startTime);
          } else if (entry.entryType === 'layout-shift') {
            if (!(entry as any).hadRecentInput) {
              this.recordCoreWebVital('cls', (entry as any).value);
            }
          }
        }
      });

      this.observer.observe({ 
        entryTypes: ['resource', 'largest-contentful-paint', 'first-input', 'layout-shift'] 
      });
    }
  }

  /**
   * Optimize image URL with CDN parameters
   */
  optimizeImageUrl(src: string, options: ImageOptimizationOptions = {}): string {
    if (!this.config.cdn.enabled) {
      return src;
    }

    const {
      width,
      height,
      quality,
      format,
      fit = 'cover',
    } = options;

    let optimizedUrl = this.buildCDNUrl(src);
    const params = new URLSearchParams();

    // Add optimization parameters based on CDN provider
    switch (this.config.cdn.provider) {
      case 'cloudflare':
        if (width) params.set('width', width.toString());
        if (height) params.set('height', height.toString());
        if (quality) params.set('quality', quality.toString());
        if (format && format !== 'svg') params.set('format', format);
        params.set('fit', fit);
        break;

      case 'vercel':
        if (width) params.set('w', width.toString());
        if (height) params.set('h', height.toString());
        if (quality) params.set('q', quality.toString());
        if (format && format !== 'svg') params.set('f', format);
        break;

      case 'aws-cloudfront':
        // AWS CloudFront with Lambda@Edge or CloudFront Functions
        if (width && height) {
          params.set('d', `${width}x${height}`);
        } else if (width) {
          params.set('d', `${width}x`);
        }
        if (quality) params.set('q', quality.toString());
        break;

      case 'custom':
        // Generic parameter format
        if (width) params.set('w', width.toString());
        if (height) params.set('h', height.toString());
        if (quality) params.set('q', quality.toString());
        if (format) params.set('f', format);
        break;
    }

    if (params.toString()) {
      optimizedUrl += (optimizedUrl.includes('?') ? '&' : '?') + params.toString();
    }

    return optimizedUrl;
  }

  /**
   * Generate responsive image srcset
   */
  generateResponsiveSrcSet(src: string, options: Omit<ImageOptimizationOptions, 'width'> = {}): string {
    if (!this.config.images.enableResponsive) {
      return '';
    }

    const breakpoints = this.config.images.breakpoints;
    const srcSetEntries: string[] = [];

    for (const width of breakpoints) {
      const optimizedUrl = this.optimizeImageUrl(src, { ...options, width });
      srcSetEntries.push(`${optimizedUrl} ${width}w`);
    }

    return srcSetEntries.join(', ');
  }

  /**
   * Generate sizes attribute for responsive images
   */
  generateSizes(breakpoints?: Array<{ minWidth: string; size: string }>): string {
    if (!breakpoints) {
      // Default responsive sizes
      return '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';
    }

    const sizesEntries = breakpoints.map(bp => `(min-width: ${bp.minWidth}) ${bp.size}`);
    sizesEntries.push('100vw'); // Default fallback

    return sizesEntries.join(', ');
  }

  /**
   * Preload critical assets
   */
  preloadAsset(src: string, options: AssetPreloadOptions): void {
    if (!this.config.caching.enablePreload || typeof document === 'undefined') {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = this.buildCDNUrl(src);
    link.as = options.as;

    if (options.crossorigin) {
      link.crossOrigin = options.crossorigin;
    }
    if (options.media) {
      link.media = options.media;
    }
    if (options.type) {
      link.type = options.type;
    }

    document.head.appendChild(link);

    this.emit('asset-preloaded', { src, options });
  }

  /**
   * Prefetch assets for next navigation
   */
  prefetchAsset(src: string): void {
    if (!this.config.caching.enablePrefetch || typeof document === 'undefined') {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = this.buildCDNUrl(src);

    document.head.appendChild(link);

    this.emit('asset-prefetched', { src });
  }

  /**
   * Get optimized asset URL with versioning
   */
  getAssetUrl(src: string, type: AssetType = 'image'): string {
    let url = this.buildCDNUrl(src);

    if (this.config.caching.enableVersioning) {
      url = this.addVersionToUrl(url);
    }

    // Track asset
    this.trackAsset(url, type);

    return url;
  }

  /**
   * Build CDN URL
   */
  private buildCDNUrl(src: string): string {
    if (!this.config.cdn.enabled || src.startsWith('http')) {
      return src;
    }

    const cdnDomain = this.config.cdn.domain;
    const cleanSrc = src.startsWith('/') ? src.slice(1) : src;

    return `${cdnDomain}/${cleanSrc}`;
  }

  /**
   * Add version to URL
   */
  private addVersionToUrl(url: string): string {
    let version: string;

    switch (this.config.caching.versionStrategy) {
      case 'hash':
        // In a real implementation, this would be the actual file hash
        version = this.generateHash(url);
        break;
      case 'timestamp':
        version = Date.now().toString();
        break;
      case 'semver':
        version = process.env.npm_package_version || '1.0.0';
        break;
      default:
        return url;
    }

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${version}`;
  }

  /**
   * Generate hash for URL (simple implementation)
   */
  private generateHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Track asset information
   */
  private trackAsset(url: string, type: AssetType): void {
    if (!this.assetCache.has(url)) {
      this.assetCache.set(url, {
        url,
        type,
        size: 0,
        format: this.getFileExtension(url),
        cacheStatus: 'unknown',
      });
    }
  }

  /**
   * Get file extension from URL
   */
  private getFileExtension(url: string): string {
    const pathname = new URL(url, 'http://example.com').pathname;
    const extension = pathname.split('.').pop();
    return extension || 'unknown';
  }

  /**
   * Record asset load time
   */
  private recordAssetLoadTime(entry: PerformanceResourceTiming): void {
    const url = entry.name;
    const loadTime = entry.responseEnd - entry.startTime;

    if (!this.loadTimeCache.has(url)) {
      this.loadTimeCache.set(url, []);
    }

    const times = this.loadTimeCache.get(url)!;
    times.push(loadTime);

    // Keep only last 10 measurements
    if (times.length > 10) {
      times.shift();
    }

    // Update asset info
    if (this.assetCache.has(url)) {
      const asset = this.assetCache.get(url)!;
      asset.loadTime = loadTime;
      asset.size = entry.transferSize || 0;
      asset.cacheStatus = entry.transferSize === 0 ? 'hit' : 'miss';
    }

    // Record to performance monitor
    if (this.performanceMonitor) {
      this.performanceMonitor.recordMetric(
        'asset_load_time' as any,
        loadTime,
        { 
          url, 
          type: this.getAssetType(url),
          size: entry.transferSize,
          cached: entry.transferSize === 0,
        },
        'cdn-optimizer'
      );
    }

    this.emit('asset-loaded', { url, loadTime, entry });
  }

  /**
   * Get asset type from URL
   */
  private getAssetType(url: string): AssetType {
    const extension = this.getFileExtension(url).toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg'].includes(extension)) {
      return 'image';
    } else if (['woff', 'woff2', 'ttf', 'otf'].includes(extension)) {
      return 'font';
    } else if (extension === 'css') {
      return 'css';
    } else if (['js', 'mjs'].includes(extension)) {
      return 'js';
    } else if (['mp3', 'wav', 'ogg'].includes(extension)) {
      return 'audio';
    } else if (['mp4', 'webm', 'avi'].includes(extension)) {
      return 'video';
    }
    
    return 'document';
  }

  /**
   * Record Core Web Vital
   */
  private recordCoreWebVital(metric: 'lcp' | 'fid' | 'cls', value: number): void {
    if (this.performanceMonitor) {
      this.performanceMonitor.recordMetric(
        `core_web_vital_${metric}` as any,
        value,
        { metric },
        'cdn-optimizer'
      );
    }

    this.emit('core-web-vital', { metric, value });
  }

  /**
   * Get CDN performance metrics
   */
  getMetrics(): CDNMetrics {
    const assets = Array.from(this.assetCache.values());
    const totalAssets = assets.length;
    const totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);
    const optimizedSize = assets.reduce((sum, asset) => sum + (asset.optimizedSize || asset.size), 0);
    const compressionRatio = totalSize > 0 ? (totalSize - optimizedSize) / totalSize : 0;

    // Calculate average load time
    const loadTimes = Array.from(this.loadTimeCache.values()).flat();
    const averageLoadTime = loadTimes.length > 0 
      ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length 
      : 0;

    // Calculate cache hit rate
    const cachedAssets = assets.filter(asset => asset.cacheStatus === 'hit').length;
    const cacheHitRate = totalAssets > 0 ? cachedAssets / totalAssets : 0;

    return {
      totalAssets,
      totalSize,
      optimizedSize,
      compressionRatio,
      averageLoadTime,
      cacheHitRate,
      bandwidthSaved: totalSize - optimizedSize,
      coreWebVitals: {
        lcp: 0, // Would be calculated from recorded metrics
        fid: 0,
        cls: 0,
      },
    };
  }

  /**
   * Generate cache headers for assets
   */
  generateCacheHeaders(assetType: AssetType): Record<string, string> {
    const headers: Record<string, string> = {};
    const { cacheHeaders } = this.config.caching;

    // Set cache-control based on asset type and configuration
    let cacheControl = `public, max-age=${cacheHeaders.maxAge}`;
    
    if (cacheHeaders.immutable) {
      cacheControl += ', immutable';
    }
    
    if (cacheHeaders.staleWhileRevalidate > 0) {
      cacheControl += `, stale-while-revalidate=${cacheHeaders.staleWhileRevalidate}`;
    }

    headers['Cache-Control'] = cacheControl;

    // Add ETag for cache validation
    headers['ETag'] = `"${this.generateHash(assetType + Date.now())}"`;

    // Add appropriate content type
    headers['Content-Type'] = this.getContentType(assetType);

    return headers;
  }

  /**
   * Get content type for asset
   */
  private getContentType(assetType: AssetType): string {
    switch (assetType) {
      case 'image':
        return 'image/*';
      case 'font':
        return 'font/woff2';
      case 'css':
        return 'text/css';
      case 'js':
        return 'application/javascript';
      case 'audio':
        return 'audio/*';
      case 'video':
        return 'video/*';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Clear asset cache
   */
  clearCache(): void {
    this.assetCache.clear();
    this.loadTimeCache.clear();
    this.emit('cache-cleared');
  }

  /**
   * Shutdown optimizer
   */
  shutdown(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.clearCache();
    this.emit('shutdown');
  }
} 
/**
 * CDN Module
 * Comprehensive CDN and asset optimization utilities
 */

// Core CDN components
export { AssetOptimizer, type AssetOptimizationConfig, type AssetInfo, type ImageOptimizationOptions, type AssetPreloadOptions, type CDNMetrics, type CDNProvider, type AssetType, type ImageFormat } from './AssetOptimizer';
export { OptimizedImage, type OptimizedImageProps } from './OptimizedImage';

// Default configurations
export const DEFAULT_CDN_CONFIG: AssetOptimizationConfig = {
  cdn: {
    provider: 'custom',
    domain: '',
    enabled: false,
  },
  images: {
    enableOptimization: true,
    enableNextGenFormats: true,
    quality: {
      jpeg: 80,
      webp: 80,
      avif: 75,
      png: 90,
    },
    enableLazyLoading: true,
    enableResponsive: true,
    breakpoints: [320, 640, 768, 1024, 1280, 1536],
    enableBlur: true,
  },
  caching: {
    enableVersioning: true,
    versionStrategy: 'hash',
    cacheHeaders: {
      immutable: true,
      maxAge: 31536000, // 1 year
      staleWhileRevalidate: 86400, // 1 day
    },
    enablePreload: true,
    enablePrefetch: true,
  },
  compression: {
    enableGzip: true,
    enableBrotli: true,
    compressionLevel: 6,
  },
  monitoring: {
    enableMetrics: true,
    trackLoadTimes: true,
    enableCoreWebVitals: true,
  },
};

/**
 * CDN Factory Functions
 */

/**
 * Create asset optimizer for Cloudflare
 */
export function createCloudflareOptimizer(config: {
  domain: string;
  zone?: string;
  apiKey?: string;
  enableMetrics?: boolean;
}): AssetOptimizer {
  const optimizerConfig: AssetOptimizationConfig = {
    ...DEFAULT_CDN_CONFIG,
    cdn: {
      provider: 'cloudflare',
      domain: config.domain,
      zone: config.zone,
      apiKey: config.apiKey,
      enabled: true,
    },
    monitoring: {
      ...DEFAULT_CDN_CONFIG.monitoring,
      enableMetrics: config.enableMetrics !== false,
    },
  };

  return new AssetOptimizer(optimizerConfig);
}

/**
 * Create asset optimizer for Vercel
 */
export function createVercelOptimizer(config: {
  domain: string;
  enableMetrics?: boolean;
}): AssetOptimizer {
  const optimizerConfig: AssetOptimizationConfig = {
    ...DEFAULT_CDN_CONFIG,
    cdn: {
      provider: 'vercel',
      domain: config.domain,
      enabled: true,
    },
    monitoring: {
      ...DEFAULT_CDN_CONFIG.monitoring,
      enableMetrics: config.enableMetrics !== false,
    },
  };

  return new AssetOptimizer(optimizerConfig);
}

/**
 * Create asset optimizer for AWS CloudFront
 */
export function createCloudFrontOptimizer(config: {
  domain: string;
  enableMetrics?: boolean;
}): AssetOptimizer {
  const optimizerConfig: AssetOptimizationConfig = {
    ...DEFAULT_CDN_CONFIG,
    cdn: {
      provider: 'aws-cloudfront',
      domain: config.domain,
      enabled: true,
    },
    monitoring: {
      ...DEFAULT_CDN_CONFIG.monitoring,
      enableMetrics: config.enableMetrics !== false,
    },
  };

  return new AssetOptimizer(optimizerConfig);
}

/**
 * Create asset optimizer for Netlify
 */
export function createNetlifyOptimizer(config: {
  domain: string;
  enableMetrics?: boolean;
}): AssetOptimizer {
  const optimizerConfig: AssetOptimizationConfig = {
    ...DEFAULT_CDN_CONFIG,
    cdn: {
      provider: 'netlify',
      domain: config.domain,
      enabled: true,
    },
    monitoring: {
      ...DEFAULT_CDN_CONFIG.monitoring,
      enableMetrics: config.enableMetrics !== false,
    },
  };

  return new AssetOptimizer(optimizerConfig);
}

/**
 * Create custom asset optimizer
 */
export function createCustomOptimizer(config: Partial<AssetOptimizationConfig>): AssetOptimizer {
  const optimizerConfig: AssetOptimizationConfig = {
    ...DEFAULT_CDN_CONFIG,
    ...config,
    cdn: {
      ...DEFAULT_CDN_CONFIG.cdn,
      ...config.cdn,
    },
    images: {
      ...DEFAULT_CDN_CONFIG.images,
      ...config.images,
    },
    caching: {
      ...DEFAULT_CDN_CONFIG.caching,
      ...config.caching,
    },
    compression: {
      ...DEFAULT_CDN_CONFIG.compression,
      ...config.compression,
    },
    monitoring: {
      ...DEFAULT_CDN_CONFIG.monitoring,
      ...config.monitoring,
    },
  };

  return new AssetOptimizer(optimizerConfig);
}

/**
 * Environment-based CDN configuration
 */
export function createOptimizerFromEnv(): AssetOptimizer {
  // Check for Vercel environment
  if (process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL) {
    return createVercelOptimizer({
      domain: process.env.CDN_DOMAIN || process.env.VERCEL_URL || '',
      enableMetrics: process.env.CDN_ENABLE_METRICS !== 'false',
    });
  }

  // Check for Netlify environment
  if (process.env.NETLIFY || process.env.DEPLOY_URL) {
    return createNetlifyOptimizer({
      domain: process.env.CDN_DOMAIN || process.env.DEPLOY_URL || '',
      enableMetrics: process.env.CDN_ENABLE_METRICS !== 'false',
    });
  }

  // Check for Cloudflare configuration
  if (process.env.CLOUDFLARE_ZONE_ID || process.env.CLOUDFLARE_API_TOKEN) {
    return createCloudflareOptimizer({
      domain: process.env.CDN_DOMAIN || '',
      zone: process.env.CLOUDFLARE_ZONE_ID,
      apiKey: process.env.CLOUDFLARE_API_TOKEN,
      enableMetrics: process.env.CDN_ENABLE_METRICS !== 'false',
    });
  }

  // Check for AWS CloudFront
  if (process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID || process.env.CLOUDFRONT_DOMAIN) {
    return createCloudFrontOptimizer({
      domain: process.env.CDN_DOMAIN || process.env.CLOUDFRONT_DOMAIN || '',
      enableMetrics: process.env.CDN_ENABLE_METRICS !== 'false',
    });
  }

  // Default to custom configuration
  return createCustomOptimizer({
    cdn: {
      provider: 'custom',
      domain: process.env.CDN_DOMAIN || '',
      enabled: Boolean(process.env.CDN_DOMAIN),
    },
    monitoring: {
      enableMetrics: process.env.CDN_ENABLE_METRICS !== 'false',
      trackLoadTimes: process.env.CDN_TRACK_LOAD_TIMES !== 'false',
      enableCoreWebVitals: process.env.CDN_ENABLE_CORE_WEB_VITALS !== 'false',
    },
    images: {
      enableOptimization: process.env.CDN_ENABLE_IMAGE_OPTIMIZATION !== 'false',
      enableNextGenFormats: process.env.CDN_ENABLE_NEXT_GEN_FORMATS !== 'false',
      enableLazyLoading: process.env.CDN_ENABLE_LAZY_LOADING !== 'false',
      enableResponsive: process.env.CDN_ENABLE_RESPONSIVE !== 'false',
      quality: {
        jpeg: parseInt(process.env.CDN_JPEG_QUALITY || '80'),
        webp: parseInt(process.env.CDN_WEBP_QUALITY || '80'),
        avif: parseInt(process.env.CDN_AVIF_QUALITY || '75'),
        png: parseInt(process.env.CDN_PNG_QUALITY || '90'),
      },
    },
    caching: {
      enableVersioning: process.env.CDN_ENABLE_VERSIONING !== 'false',
      versionStrategy: (process.env.CDN_VERSION_STRATEGY as 'hash' | 'timestamp' | 'semver') || 'hash',
      enablePreload: process.env.CDN_ENABLE_PRELOAD !== 'false',
      enablePrefetch: process.env.CDN_ENABLE_PREFETCH !== 'false',
    },
  });
}

/**
 * CDN Utilities
 */
export const CDNUtils = {
  /**
   * Generate responsive breakpoints for different device types
   */
  generateBreakpoints(): number[] {
    return [
      320,  // Mobile portrait
      375,  // Mobile portrait (iPhone 6/7/8)
      414,  // Mobile portrait (iPhone 6/7/8 Plus)
      768,  // Tablet portrait
      1024, // Tablet landscape / Desktop small
      1280, // Desktop medium
      1440, // Desktop large
      1920, // Desktop extra large
    ];
  },

  /**
   * Get recommended image quality settings
   */
  getQualitySettings(useCase: 'thumbnails' | 'content' | 'hero' | 'print'): AssetOptimizationConfig['images']['quality'] {
    switch (useCase) {
      case 'thumbnails':
        return { jpeg: 70, webp: 70, avif: 65, png: 80 };
      case 'content':
        return { jpeg: 80, webp: 80, avif: 75, png: 90 };
      case 'hero':
        return { jpeg: 90, webp: 85, avif: 80, png: 95 };
      case 'print':
        return { jpeg: 95, webp: 90, avif: 85, png: 100 };
      default:
        return DEFAULT_CDN_CONFIG.images.quality;
    }
  },

  /**
   * Generate cache headers for different asset types
   */
  getCacheHeaders(assetType: AssetType, cacheStrategy: 'aggressive' | 'moderate' | 'conservative' = 'moderate'): Record<string, string> {
    const strategies = {
      aggressive: { maxAge: 31536000, staleWhileRevalidate: 86400 }, // 1 year, 1 day
      moderate: { maxAge: 86400, staleWhileRevalidate: 3600 },      // 1 day, 1 hour
      conservative: { maxAge: 3600, staleWhileRevalidate: 300 },    // 1 hour, 5 minutes
    };

    const { maxAge, staleWhileRevalidate } = strategies[cacheStrategy];

    const headers: Record<string, string> = {
      'Cache-Control': `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    };

    // Add immutable for static assets
    if (['image', 'font', 'css', 'js'].includes(assetType) && cacheStrategy === 'aggressive') {
      headers['Cache-Control'] += ', immutable';
    }

    return headers;
  },

  /**
   * Detect optimal image format based on browser support
   */
  detectOptimalFormat(): ImageFormat {
    if (typeof window === 'undefined') {
      return 'webp'; // Default for SSR
    }

    // Check for AVIF support
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    try {
      if (canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0) {
        return 'avif';
      }
    } catch (e) {
      // AVIF not supported
    }

    // Check for WebP support
    try {
      if (canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0) {
        return 'webp';
      }
    } catch (e) {
      // WebP not supported
    }

    return 'jpeg'; // Fallback to JPEG
  },

  /**
   * Calculate bandwidth savings from optimization
   */
  calculateSavings(originalSize: number, optimizedSize: number): {
    bytes: number;
    percentage: number;
    formatted: string;
  } {
    const bytes = originalSize - optimizedSize;
    const percentage = originalSize > 0 ? (bytes / originalSize) * 100 : 0;
    
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return {
      bytes,
      percentage: Math.round(percentage * 100) / 100,
      formatted: formatBytes(bytes),
    };
  },
} as const;

/**
 * Global CDN manager singleton (optional)
 */
let globalCDNOptimizer: AssetOptimizer | null = null;

/**
 * Get or create global CDN optimizer
 */
export function getGlobalCDNOptimizer(): AssetOptimizer {
  if (!globalCDNOptimizer) {
    globalCDNOptimizer = createOptimizerFromEnv();
  }
  return globalCDNOptimizer;
}

/**
 * Set global CDN optimizer
 */
export function setGlobalCDNOptimizer(optimizer: AssetOptimizer): void {
  globalCDNOptimizer = optimizer;
}

/**
 * Shutdown global CDN optimizer
 */
export function shutdownGlobalCDN(): void {
  if (globalCDNOptimizer) {
    globalCDNOptimizer.shutdown();
    globalCDNOptimizer = null;
  }
} 
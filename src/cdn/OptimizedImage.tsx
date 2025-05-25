/**
 * Optimized Image Component
 * React component with automatic CDN optimization, responsive images, and performance tracking
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AssetOptimizer, type ImageOptimizationOptions } from './AssetOptimizer';

/**
 * Optimized image props
 */
export interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'sizes'> {
  src: string;
  alt: string;
  
  // Optimization options
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  
  // Responsive options
  responsive?: boolean;
  breakpoints?: Array<{ minWidth: string; size: string }>;
  customSizes?: string;
  
  // Loading options
  lazy?: boolean;
  blur?: boolean;
  blurDataUrl?: string;
  placeholder?: React.ReactNode;
  
  // Performance options
  priority?: boolean; // Preload critical images
  unoptimized?: boolean; // Skip optimization
  
  // Event handlers
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onError?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onLoadStart?: () => void;
  onLoadComplete?: (naturalWidth: number, naturalHeight: number) => void;
  
  // Asset optimizer instance
  optimizer?: AssetOptimizer;
}

/**
 * Optimized Image Component
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  quality,
  format,
  fit = 'cover',
  responsive = true,
  breakpoints,
  customSizes,
  lazy = true,
  blur = false,
  blurDataUrl,
  placeholder,
  priority = false,
  unoptimized = false,
  onLoad,
  onError,
  onLoadStart,
  onLoadComplete,
  optimizer,
  className,
  style,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(!lazy || priority);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadStartTimeRef = useRef<number>(0);

  // Initialize intersection observer for lazy loading
  useEffect(() => {
    if (lazy && !priority && 'IntersectionObserver' in window) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsIntersecting(true);
            observerRef.current?.disconnect();
          }
        },
        {
          rootMargin: '50px', // Load images 50px before they come into view
        }
      );

      if (imgRef.current) {
        observerRef.current.observe(imgRef.current);
      }
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [lazy, priority]);

  // Preload priority images
  useEffect(() => {
    if (priority && optimizer && !unoptimized) {
      const optimizationOptions: ImageOptimizationOptions = {
        width,
        height,
        quality,
        format,
        fit,
      };

      const optimizedSrc = optimizer.optimizeImageUrl(src, optimizationOptions);
      
      optimizer.preloadAsset(optimizedSrc, {
        as: 'image',
        crossorigin: 'anonymous',
      });
    }
  }, [priority, optimizer, src, width, height, quality, format, fit, unoptimized]);

  // Generate optimized URLs
  const getOptimizedUrls = useCallback(() => {
    if (unoptimized || !optimizer) {
      return {
        src,
        srcSet: '',
        sizes: '',
      };
    }

    const optimizationOptions: ImageOptimizationOptions = {
      width,
      height,
      quality,
      format,
      fit,
    };

    const optimizedSrc = optimizer.optimizeImageUrl(src, optimizationOptions);
    let srcSet = '';
    let sizes = '';

    if (responsive) {
      srcSet = optimizer.generateResponsiveSrcSet(src, {
        quality,
        format,
        fit,
      });
      
      sizes = customSizes || optimizer.generateSizes(breakpoints);
    }

    return {
      src: optimizedSrc,
      srcSet,
      sizes,
    };
  }, [src, width, height, quality, format, fit, responsive, customSizes, breakpoints, optimizer, unoptimized]);

  // Handle image load start
  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    loadStartTimeRef.current = performance.now();
    onLoadStart?.();
  }, [onLoadStart]);

  // Handle image load
  const handleLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = event.currentTarget;
    const loadTime = performance.now() - loadStartTimeRef.current;
    
    setIsLoaded(true);
    setIsLoading(false);
    setNaturalDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight,
    });

    // Record load metrics
    if (optimizer) {
      // This would be recorded automatically by the performance observer
      // but we can emit a custom event with additional context
      optimizer.emit('image-loaded', {
        src,
        loadTime,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        optimized: !unoptimized,
      });
    }

    onLoad?.(event);
    onLoadComplete?.(img.naturalWidth, img.naturalHeight);
  }, [src, optimizer, unoptimized, onLoad, onLoadComplete]);

  // Handle image error
  const handleError = useCallback((event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    setIsLoading(false);
    
    if (optimizer) {
      optimizer.emit('image-error', {
        src,
        error: 'Failed to load image',
      });
    }

    onError?.(event);
  }, [src, optimizer, onError]);

  // Get blur data URL
  const getBlurDataUrl = useCallback(() => {
    if (blurDataUrl) {
      return blurDataUrl;
    }

    if (blur && optimizer && !unoptimized) {
      // Generate a very small, low-quality version for blur placeholder
      return optimizer.optimizeImageUrl(src, {
        width: 10,
        height: 10,
        quality: 10,
        format: 'jpeg',
      });
    }

    return undefined;
  }, [blur, blurDataUrl, optimizer, src, unoptimized]);

  // Generate component styles
  const getStyles = useCallback(() => {
    const componentStyles: React.CSSProperties = {
      ...style,
    };

    // Add blur effect if loading and blur is enabled
    if (isLoading && blur && !isLoaded) {
      componentStyles.filter = 'blur(20px)';
      componentStyles.transition = 'filter 0.2s ease-out';
    } else if (isLoaded && blur) {
      componentStyles.filter = 'blur(0px)';
      componentStyles.transition = 'filter 0.2s ease-out';
    }

    // Handle lazy loading visibility
    if (lazy && !isIntersecting && !priority) {
      componentStyles.opacity = 0;
    }

    return componentStyles;
  }, [style, isLoading, blur, isLoaded, lazy, isIntersecting, priority]);

  // Generate component classes
  const getClasses = useCallback(() => {
    const classes = [className].filter(Boolean);
    
    if (isLoading) classes.push('optimized-image--loading');
    if (isLoaded) classes.push('optimized-image--loaded');
    if (hasError) classes.push('optimized-image--error');
    if (lazy) classes.push('optimized-image--lazy');
    if (responsive) classes.push('optimized-image--responsive');
    
    return classes.join(' ');
  }, [className, isLoading, isLoaded, hasError, lazy, responsive]);

  // If lazy loading and not intersecting, show placeholder
  if (lazy && !isIntersecting && !priority) {
    return (
      <div
        ref={imgRef as any}
        className={`optimized-image-placeholder ${className || ''}`}
        style={{
          width,
          height,
          backgroundColor: '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
      >
        {placeholder || <div style={{ color: '#999' }}>Loading...</div>}
      </div>
    );
  }

  // Show error state
  if (hasError) {
    return (
      <div
        className={`optimized-image-error ${className || ''}`}
        style={{
          width,
          height,
          backgroundColor: '#fee',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#c44',
          ...style,
        }}
      >
        Failed to load image
      </div>
    );
  }

  const { src: optimizedSrc, srcSet, sizes } = getOptimizedUrls();
  const blurDataUrl = getBlurDataUrl();

  return (
    <>
      {/* Blur placeholder */}
      {blur && blurDataUrl && !isLoaded && (
        <img
          src={blurDataUrl}
          alt=""
          className="optimized-image-blur"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: fit,
            filter: 'blur(20px)',
            zIndex: -1,
          }}
          aria-hidden="true"
        />
      )}
      
      {/* Main image */}
      <img
        {...props}
        ref={imgRef}
        src={optimizedSrc}
        srcSet={srcSet || undefined}
        sizes={sizes || undefined}
        alt={alt}
        className={getClasses()}
        style={getStyles()}
        loading={lazy && !priority ? 'lazy' : 'eager'}
        decoding="async"
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onError={handleError}
      />
    </>
  );
};

// Default props
OptimizedImage.defaultProps = {
  responsive: true,
  lazy: true,
  blur: false,
  priority: false,
  unoptimized: false,
  fit: 'cover',
};

export default OptimizedImage; 
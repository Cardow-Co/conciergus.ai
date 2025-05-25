/**
 * Cache Hooks Module
 * React hooks for cache-enabled AI functionality
 */

// Main cache hooks
export {
  useCachedChat,
  type UseCachedChatConfig,
  type UseCachedChatReturn,
  type CachedChatSession,
} from './useCachedChat';

// Additional cache hooks
export { useCacheMetrics } from './useCacheMetrics';
export { useCacheManager } from './useCacheManager';

// Re-export cache types for convenience
export type {
  CacheManager,
  CacheManagerConfig,
  CacheResult,
  CacheStats,
  CachePattern,
  CacheProvider,
} from '../../cache';

// Re-export cache utilities
export { CacheKeys, CacheTTL } from '../../cache';

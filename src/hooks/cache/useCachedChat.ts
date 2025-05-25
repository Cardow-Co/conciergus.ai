/**
 * Cached Chat Hook
 * Enhanced chat hook with conversation caching and AI response optimization
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { useChat, type UseChatOptions, type Message } from 'ai/react';
import { CacheManager, CacheKeys, CacheTTL, type CacheResult } from '../../cache';

/**
 * Cached chat configuration
 */
export interface UseCachedChatConfig extends Omit<UseChatOptions, 'id'> {
  // Cache configuration
  sessionId: string;
  enableCaching?: boolean;
  enableResponseCaching?: boolean;
  messageCacheTtl?: number;
  responseCacheTtl?: number;
  maxCachedMessages?: number;
  
  // Performance optimization
  enablePrefetch?: boolean;
  enableBatching?: boolean;
  debounceMs?: number;
  
  // Cache invalidation
  invalidateOnError?: boolean;
  autoInvalidateAfter?: number;
  
  // Cache manager
  cacheManager?: CacheManager;
}

/**
 * Chat session state
 */
export interface CachedChatSession {
  sessionId: string;
  messages: Message[];
  metadata: {
    createdAt: Date;
    lastActivity: Date;
    messageCount: number;
    cacheHits: number;
    cacheMisses: number;
  };
}

/**
 * Cache-enabled chat hook return type
 */
export interface UseCachedChatReturn extends ReturnType<typeof useChat> {
  // Cache information
  cacheStats: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  
  // Session management
  session: CachedChatSession | null;
  loadSession: (sessionId: string) => Promise<boolean>;
  saveSession: () => Promise<boolean>;
  clearSession: () => Promise<boolean>;
  
  // Cache control
  invalidateCache: () => Promise<void>;
  getCacheStatus: () => Promise<CacheResult<any>>;
  warmCache: (messages: Message[]) => Promise<void>;
  
  // Performance metrics
  performance: {
    averageResponseTime: number;
    cacheLatency: number;
    totalRequests: number;
  };
}

/**
 * Cache-enabled chat hook
 */
export function useCachedChat(config: UseCachedChatConfig): UseCachedChatReturn {
  const {
    sessionId,
    enableCaching = true,
    enableResponseCaching = true,
    messageCacheTtl = CacheTTL.EXTENDED,
    responseCacheTtl = CacheTTL.LONG,
    maxCachedMessages = 1000,
    enablePrefetch = false,
    enableBatching = false,
    debounceMs = 300,
    invalidateOnError = true,
    autoInvalidateAfter,
    cacheManager: externalCacheManager,
    ...chatOptions
  } = config;

  // Internal state
  const [cacheManager, setCacheManager] = useState<CacheManager | null>(externalCacheManager || null);
  const [session, setSession] = useState<CachedChatSession | null>(null);
  const [cacheStats, setCacheStats] = useState({ hits: 0, misses: 0, hitRate: 0 });
  const [performance, setPerformance] = useState({
    averageResponseTime: 0,
    cacheLatency: 0,
    totalRequests: 0,
  });

  // References for tracking
  const responseTimesRef = useRef<number[]>([]);
  const cacheLatenciesRef = useRef<number[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Initialize cache manager if not provided
  useEffect(() => {
    if (!externalCacheManager && enableCaching) {
      // Import and initialize global cache manager
      import('../../cache').then(({ getGlobalCacheManager, initializeGlobalCache }) => {
        initializeGlobalCache().then((manager) => {
          setCacheManager(manager);
        }).catch((error) => {
          console.warn('Failed to initialize cache manager:', error);
        });
      });
    }
  }, [externalCacheManager, enableCaching]);

  // Load session on mount or sessionId change
  useEffect(() => {
    if (enableCaching && cacheManager && sessionId) {
      loadSession(sessionId);
    }
  }, [sessionId, cacheManager, enableCaching]);

  // Auto-invalidate cache
  useEffect(() => {
    if (autoInvalidateAfter && cacheManager) {
      const timer = setTimeout(() => {
        invalidateCache();
      }, autoInvalidateAfter);

      return () => clearTimeout(timer);
    }
  }, [autoInvalidateAfter, cacheManager]);

  // Enhanced chat options with caching integration
  const enhancedChatOptions: UseChatOptions = {
    ...chatOptions,
    id: sessionId,
    
    onResponse: async (response) => {
      const endTime = Date.now();
      
      // Record response time
      if (responseTimesRef.current.length === 0) {
        responseTimesRef.current.push(endTime);
      }
      responseTimesRef.current.push(endTime - responseTimesRef.current[responseTimesRef.current.length - 1]);
      
      // Limit tracking arrays
      if (responseTimesRef.current.length > 100) {
        responseTimesRef.current = responseTimesRef.current.slice(-50);
      }

      // Update performance metrics
      updatePerformanceMetrics();

      // Call original onResponse if provided
      if (chatOptions.onResponse) {
        await chatOptions.onResponse(response);
      }
    },

    onFinish: async (message) => {
      // Cache the AI response if enabled
      if (enableResponseCaching && cacheManager) {
        await cacheAIResponse(message);
      }

      // Save session with debouncing
      if (enableCaching) {
        debouncedSaveSession();
      }

      // Call original onFinish if provided
      if (chatOptions.onFinish) {
        await chatOptions.onFinish(message);
      }
    },

    onError: async (error) => {
      // Invalidate cache on error if configured
      if (invalidateOnError && cacheManager) {
        await invalidateCache();
      }

      // Call original onError if provided
      if (chatOptions.onError) {
        await chatOptions.onError(error);
      }
    },
  };

  // Use the base chat hook
  const chat = useChat(enhancedChatOptions);

  /**
   * Generate cache key for AI response
   */
  const generateResponseCacheKey = useCallback((messages: Message[]): string => {
    // Create a hash of the conversation context
    const context = messages.slice(-5).map(m => `${m.role}:${m.content}`).join('|');
    const hash = btoa(context).slice(0, 16);
    return CacheKeys.aiResponse(hash);
  }, []);

  /**
   * Cache AI response
   */
  const cacheAIResponse = useCallback(async (message: Message): Promise<void> => {
    if (!cacheManager || !enableResponseCaching) return;

    try {
      const cacheKey = generateResponseCacheKey([...chat.messages, message]);
      await cacheManager.set(cacheKey, message, responseCacheTtl, {
        sessionId,
        timestamp: Date.now(),
        messageId: message.id,
      });
    } catch (error) {
      console.warn('Failed to cache AI response:', error);
    }
  }, [cacheManager, enableResponseCaching, chat.messages, sessionId, responseCacheTtl]);

  /**
   * Try to get cached AI response
   */
  const getCachedResponse = useCallback(async (messages: Message[]): Promise<Message | null> => {
    if (!cacheManager || !enableResponseCaching) return null;

    try {
      const startTime = Date.now();
      const cacheKey = generateResponseCacheKey(messages);
      const result = await cacheManager.get<Message>(cacheKey);
      
      // Record cache latency
      cacheLatenciesRef.current.push(Date.now() - startTime);
      if (cacheLatenciesRef.current.length > 100) {
        cacheLatenciesRef.current = cacheLatenciesRef.current.slice(-50);
      }

      if (result.success && result.value) {
        // Update cache stats
        setCacheStats(prev => ({
          hits: prev.hits + 1,
          misses: prev.misses,
          hitRate: (prev.hits + 1) / (prev.hits + prev.misses + 1),
        }));

        return result.value;
      } else {
        // Update cache stats
        setCacheStats(prev => ({
          hits: prev.hits,
          misses: prev.misses + 1,
          hitRate: prev.hits / (prev.hits + prev.misses + 1),
        }));
      }
    } catch (error) {
      console.warn('Failed to get cached response:', error);
    }

    return null;
  }, [cacheManager, enableResponseCaching]);

  /**
   * Load session from cache
   */
  const loadSession = useCallback(async (targetSessionId: string): Promise<boolean> => {
    if (!cacheManager || !enableCaching) return false;

    try {
      const sessionKey = CacheKeys.conversation(targetSessionId);
      const result = await cacheManager.get<CachedChatSession>(sessionKey);

      if (result.success && result.value) {
        setSession(result.value);
        
        // Load messages into chat
        if (result.value.messages.length > 0) {
          // Update chat state with cached messages
          // Note: This might require extending the base useChat hook
          // For now, we'll store it in our session state
        }

        return true;
      }
    } catch (error) {
      console.warn('Failed to load session:', error);
    }

    // Create new session if not found
    const newSession: CachedChatSession = {
      sessionId: targetSessionId,
      messages: [],
      metadata: {
        createdAt: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
        cacheHits: 0,
        cacheMisses: 0,
      },
    };

    setSession(newSession);
    return false;
  }, [cacheManager, enableCaching]);

  /**
   * Save session to cache
   */
  const saveSession = useCallback(async (): Promise<boolean> => {
    if (!cacheManager || !enableCaching || !session) return false;

    try {
      const updatedSession: CachedChatSession = {
        ...session,
        messages: chat.messages.slice(-maxCachedMessages),
        metadata: {
          ...session.metadata,
          lastActivity: new Date(),
          messageCount: chat.messages.length,
          cacheHits: cacheStats.hits,
          cacheMisses: cacheStats.misses,
        },
      };

      const sessionKey = CacheKeys.conversation(sessionId);
      const result = await cacheManager.set(sessionKey, updatedSession, messageCacheTtl);

      if (result.success) {
        setSession(updatedSession);
        return true;
      }
    } catch (error) {
      console.warn('Failed to save session:', error);
    }

    return false;
  }, [cacheManager, enableCaching, session, chat.messages, maxCachedMessages, sessionId, messageCacheTtl, cacheStats]);

  /**
   * Debounced save session
   */
  const debouncedSaveSession = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      saveSession();
    }, debounceMs);
  }, [saveSession, debounceMs]);

  /**
   * Clear session from cache
   */
  const clearSession = useCallback(async (): Promise<boolean> => {
    if (!cacheManager || !enableCaching) return false;

    try {
      const sessionKey = CacheKeys.conversation(sessionId);
      const result = await cacheManager.delete(sessionKey);

      if (result.success) {
        setSession(null);
        return true;
      }
    } catch (error) {
      console.warn('Failed to clear session:', error);
    }

    return false;
  }, [cacheManager, enableCaching, sessionId]);

  /**
   * Invalidate all cache entries for this session
   */
  const invalidateCache = useCallback(async (): Promise<void> => {
    if (!cacheManager) return;

    try {
      await cacheManager.clear(`*${sessionId}*`);
    } catch (error) {
      console.warn('Failed to invalidate cache:', error);
    }
  }, [cacheManager, sessionId]);

  /**
   * Get cache status
   */
  const getCacheStatus = useCallback(async (): Promise<CacheResult<any>> => {
    if (!cacheManager) {
      return {
        success: false,
        fromCache: false,
        provider: 'memory',
        latency: 0,
        error: new Error('Cache manager not available'),
      };
    }

    const sessionKey = CacheKeys.conversation(sessionId);
    return await cacheManager.exists(sessionKey);
  }, [cacheManager, sessionId]);

  /**
   * Warm cache with messages
   */
  const warmCache = useCallback(async (messages: Message[]): Promise<void> => {
    if (!cacheManager || !enableCaching) return;

    try {
      // Cache messages in batches
      const batchSize = enableBatching ? 10 : 1;
      
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (message, index) => {
            const cacheKey = CacheKeys.aiResponse(`${sessionId}-${i + index}`);
            await cacheManager.set(cacheKey, message, responseCacheTtl);
          })
        );
      }
    } catch (error) {
      console.warn('Failed to warm cache:', error);
    }
  }, [cacheManager, enableCaching, enableBatching, sessionId, responseCacheTtl]);

  /**
   * Update performance metrics
   */
  const updatePerformanceMetrics = useCallback(() => {
    setPerformance(prev => {
      const avgResponseTime = responseTimesRef.current.length > 0
        ? responseTimesRef.current.reduce((sum, time) => sum + time, 0) / responseTimesRef.current.length
        : 0;

      const avgCacheLatency = cacheLatenciesRef.current.length > 0
        ? cacheLatenciesRef.current.reduce((sum, time) => sum + time, 0) / cacheLatenciesRef.current.length
        : 0;

      return {
        averageResponseTime: avgResponseTime,
        cacheLatency: avgCacheLatency,
        totalRequests: prev.totalRequests + 1,
      };
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    ...chat,
    cacheStats,
    session,
    loadSession,
    saveSession,
    clearSession,
    invalidateCache,
    getCacheStatus,
    warmCache,
    performance,
  };
} 
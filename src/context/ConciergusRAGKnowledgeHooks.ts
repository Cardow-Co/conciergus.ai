import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useGateway } from './GatewayProvider';
import { embed, embedMany } from 'ai';
import type { DebugManager } from './DebugManager';
import type { ConciergusConfig } from './ConciergusContext';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface DocumentChunk {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    documentId: string;
    chunkIndex: number;
    source: string;
    title?: string;
    tags?: string[];
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  source: string;
  format: 'text' | 'markdown' | 'pdf' | 'html' | 'json';
  metadata: {
    tags: string[];
    category?: string;
    author?: string;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    size: number;
  };
  chunks: DocumentChunk[];
  embeddings: number[][];
  isIndexed: boolean;
  lastIndexed?: Date;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  documents: KnowledgeDocument[];
  settings: {
    embeddingModel: string;
    chunkSize: number;
    chunkOverlap: number;
    similarityThreshold: number;
    maxResults: number;
    enableReranking: boolean;
  };
  statistics: {
    totalDocuments: number;
    totalChunks: number;
    totalTokens: number;
    lastUpdated: Date;
    indexingProgress: number;
  };
}

export interface SearchResult {
  chunk: DocumentChunk;
  similarity: number;
  relevanceScore: number;
  document: KnowledgeDocument;
  context: {
    previousChunk?: DocumentChunk;
    nextChunk?: DocumentChunk;
  };
}

export interface RAGContext {
  query: string;
  results: SearchResult[];
  formattedContext: string;
  confidence: number;
  sources: Array<{
    documentId: string;
    title: string;
    relevance: number;
    snippet: string;
  }>;
}

export interface ConciergusRAGConfig {
  embeddingModel: string;
  chunkSize: number;
  chunkOverlap: number;
  similarityThreshold: number;
  maxResults: number;
  enableContextExpansion: boolean;
  enableReranking: boolean;
  rerankingModel?: string;
  enableCaching: boolean;
  cacheSize: number;
  debugMode: boolean;
}

export interface ConciergusKnowledgeConfig {
  maxDocuments: number;
  maxDocumentSize: number; // bytes
  supportedFormats: string[];
  autoIndexing: boolean;
  indexingBatchSize: number;
  enableVersioning: boolean;
  enableFullTextSearch: boolean;
  enableMetadataSearch: boolean;
  retentionPeriod: number; // days
  compressionEnabled: boolean;
}

// ============================================================================
// useConciergusRAG Hook
// ============================================================================

export interface ConciergusRAGHookReturn {
  // Configuration
  config: ConciergusRAGConfig;
  updateConfig: (updates: Partial<ConciergusRAGConfig>) => void;
  
  // Embedding Operations
  generateEmbedding: (text: string) => Promise<number[]>;
  generateEmbeddings: (texts: string[]) => Promise<number[][]>;
  
  // Search Operations
  search: (query: string, knowledgeBaseId?: string) => Promise<SearchResult[]>;
  semanticSearch: (query: string, options?: {
    threshold?: number;
    maxResults?: number;
    includeContext?: boolean;
  }) => Promise<RAGContext>;
  
  // Context Operations
  buildContext: (results: SearchResult[]) => string;
  formatContext: (context: RAGContext, template?: string) => string;
  expandContext: (results: SearchResult[]) => Promise<SearchResult[]>;
  
  // Reranking
  rerankResults: (query: string, results: SearchResult[]) => Promise<SearchResult[]>;
  
  // Caching
  cacheEmbedding: (text: string, embedding: number[]) => void;
  getCachedEmbedding: (text: string) => number[] | null;
  clearEmbeddingCache: () => void;
  
  // Analytics
  getSearchAnalytics: () => {
    totalSearches: number;
    averageResponseTime: number;
    cacheHitRate: number;
    popularQueries: Array<{ query: string; count: number }>;
  };
  
  // State
  isSearching: boolean;
  lastSearch: {
    query: string;
    results: SearchResult[];
    timestamp: Date;
  } | null;
}

export function useConciergusRAG(
  initialConfig: Partial<ConciergusRAGConfig> = {}
): ConciergusRAGHookReturn {
  const gateway = useGateway();
  
  const [config, setConfig] = useState<ConciergusRAGConfig>({
    embeddingModel: 'text-embedding-3-small',
    chunkSize: 1000,
    chunkOverlap: 200,
    similarityThreshold: 0.7,
    maxResults: 5,
    enableContextExpansion: true,
    enableReranking: false,
    enableCaching: true,
    cacheSize: 1000,
    debugMode: false,
    ...initialConfig
  });
  
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearch, setLastSearch] = useState<{
    query: string;
    results: SearchResult[];
    timestamp: Date;
  } | null>(null);
  
  const [searchAnalytics, setSearchAnalytics] = useState({
    totalSearches: 0,
    totalResponseTime: 0,
    cacheHits: 0,
    queryHistory: [] as Array<{ query: string; timestamp: Date; responseTime: number }>
  });
  
  const embeddingCache = useRef<Map<string, number[]>>(new Map());
  const searchCache = useRef<Map<string, SearchResult[]>>(new Map());

  // Get embedding model from gateway or use default
  const getEmbeddingModel = useCallback(() => {
    // Check if gateway provides embedding model
    const gatewayModel = gateway?.getEmbeddingModel?.();
    if (gatewayModel) return gatewayModel;
    
    // Fallback to OpenAI model (assuming it's configured in gateway)
    return gateway?.createEmbeddingModel?.(config.embeddingModel) || null;
  }, [gateway, config.embeddingModel]);

  // Rerank results using a reranking model - MOVED BEFORE search function
  const rerankResults = useCallback(async (
    query: string, 
    results: SearchResult[]
  ): Promise<SearchResult[]> => {
    // This is a placeholder for actual reranking implementation
    // In a real implementation, you would use a cross-encoder model
    // or another reranking algorithm
    
    // For now, we'll use a simple approach based on query term overlap
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    return results.map(result => {
      const contentTerms = result.chunk.content.toLowerCase().split(/\s+/);
      const overlap = queryTerms.filter(term => 
        contentTerms.some(contentTerm => contentTerm.includes(term))
      ).length;
      
      const rerankScore = (overlap / queryTerms.length) * 0.3 + result.similarity * 0.7;
      
      return {
        ...result,
        relevanceScore: rerankScore
      };
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }, []);

  // Generate single embedding
  const generateEmbedding = useCallback(async (text: string): Promise<number[]> => {
    const startTime = Date.now();
    
    try {
      // Check cache first
      if (config.enableCaching) {
        const cached = embeddingCache.current.get(text);
        if (cached) {
          setSearchAnalytics(prev => ({
            ...prev,
            cacheHits: prev.cacheHits + 1
          }));
          return cached;
        }
      }
      
      const model = getEmbeddingModel();
      if (!model) {
        throw new Error('No embedding model available');
      }
      
      const { embedding } = await embed({
        model,
        value: text.replace(/\n/g, ' ').trim()
      });
      
      // Cache the result
      if (config.enableCaching && embeddingCache.current.size < config.cacheSize) {
        embeddingCache.current.set(text, embedding);
      }
      
      if (config.debugMode && gateway.debugManager) {
        gateway.debugManager.info('Generated embedding', {
          textLength: text.length,
          embeddingDimensions: embedding.length,
          responseTime: Date.now() - startTime
        }, 'RAG', 'embedding');
      }
      
      return embedding;
    } catch (error) {
      if (gateway?.debugManager) {
        gateway.debugManager.error('Embedding generation failed', { error }, 'RAG', 'embedding');
      }
      throw error;
    }
  }, [config, getEmbeddingModel, gateway]);

  // Generate multiple embeddings
  const generateEmbeddings = useCallback(async (texts: string[]): Promise<number[][]> => {
    const startTime = Date.now();
    
    try {
      const model = getEmbeddingModel();
      if (!model) {
        throw new Error('No embedding model available');
      }
      
      // Check cache for existing embeddings
      const cachedResults: { [index: number]: number[] } = {};
      const uncachedTexts: string[] = [];
      const uncachedIndices: number[] = [];
      
      if (config.enableCaching) {
        texts.forEach((text, index) => {
          const cached = embeddingCache.current.get(text);
          if (cached) {
            cachedResults[index] = cached;
          } else {
            uncachedTexts.push(text);
            uncachedIndices.push(index);
          }
        });
      } else {
        uncachedTexts.push(...texts);
        uncachedIndices.push(...texts.map((_, i) => i));
      }
      
      let newEmbeddings: number[][] = [];
      
      if (uncachedTexts.length > 0) {
        const cleanedTexts = uncachedTexts.map(text => text.replace(/\n/g, ' ').trim());
        
        const { embeddings } = await embedMany({
          model,
          values: cleanedTexts
        });
        
        newEmbeddings = embeddings;
        
        // Cache new embeddings
        if (config.enableCaching) {
          uncachedTexts.forEach((text, index) => {
            if (embeddingCache.current.size < config.cacheSize) {
              embeddingCache.current.set(text, newEmbeddings[index]);
            }
          });
        }
      }
      
      // Combine cached and new embeddings
      const allEmbeddings: number[][] = new Array(texts.length);
      
      Object.entries(cachedResults).forEach(([index, embedding]) => {
        allEmbeddings[parseInt(index)] = embedding;
      });
      
      uncachedIndices.forEach((originalIndex, newIndex) => {
        allEmbeddings[originalIndex] = newEmbeddings[newIndex];
      });
      
      if (config.debugMode && gateway.debugManager) {
        gateway.debugManager.info('Generated embeddings batch', {
          totalTexts: texts.length,
          cachedCount: Object.keys(cachedResults).length,
          newCount: uncachedTexts.length,
          responseTime: Date.now() - startTime
        }, 'RAG', 'embedding');
      }
      
      return allEmbeddings;
    } catch (error) {
      if (gateway?.debugManager) {
        gateway.debugManager.error('Batch embedding generation failed', { error }, 'RAG', 'embedding');
      }
      throw error;
    }
  }, [config, getEmbeddingModel, gateway]);

  // Main search function
  const search = useCallback(async (
    query: string,
    knowledgeBaseId?: string
  ): Promise<SearchResult[]> => {
    const startTime = Date.now();
    setIsSearching(true);
    
    try {
      // Check search cache
      const cacheKey = `${query}-${knowledgeBaseId || 'default'}`;
      if (config.enableCaching) {
        const cached = searchCache.current.get(cacheKey);
        if (cached) {
          setIsSearching(false);
          
          // Update analytics for cache hit
          setSearchAnalytics(prev => ({
            ...prev,
            cacheHits: prev.cacheHits + 1,
            totalSearches: prev.totalSearches + 1
          }));
          
          return cached;
        }
      }
      
      // Generate query embedding
      const queryEmbedding = await generateEmbedding(query);
      
      // Get knowledge bases from gateway or use provided ID
      const knowledgeBases = gateway?.getKnowledgeBases?.() || {};
      const targetBases = knowledgeBaseId 
        ? { [knowledgeBaseId]: knowledgeBases[knowledgeBaseId] }
        : knowledgeBases;
      
      const allResults: SearchResult[] = [];
      
      // Search through all knowledge bases
      for (const [baseId, knowledgeBase] of Object.entries(targetBases)) {
        if (!knowledgeBase?.documents) continue;
        
        for (const document of knowledgeBase.documents) {
          if (!document.isIndexed) continue;
          
          for (const chunk of document.chunks) {
            const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
            
            if (similarity >= config.similarityThreshold) {
              // Find context chunks
              const chunkIndex = chunk.metadata.chunkIndex;
              const previousChunk = document.chunks.find(c => c.metadata.chunkIndex === chunkIndex - 1);
              const nextChunk = document.chunks.find(c => c.metadata.chunkIndex === chunkIndex + 1);
              
              allResults.push({
                chunk,
                similarity,
                relevanceScore: similarity,
                document,
                context: {
                  previousChunk,
                  nextChunk
                }
              });
            }
          }
        }
      }
      
      // Sort by similarity and limit results
      const sortedResults = allResults
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, config.maxResults);
      
      // Apply reranking if enabled
      let finalResults = sortedResults;
      if (config.enableReranking && sortedResults.length > 1) {
        finalResults = await rerankResults(query, sortedResults);
      }
      
      // Cache results
      if (config.enableCaching) {
        searchCache.current.set(cacheKey, finalResults);
      }
      
      // Update analytics
      const responseTime = Date.now() - startTime;
      setSearchAnalytics(prev => ({
        ...prev,
        totalSearches: prev.totalSearches + 1,
        totalResponseTime: prev.totalResponseTime + responseTime,
        queryHistory: [...prev.queryHistory, { query, timestamp: new Date(), responseTime }]
      }));
      
      setLastSearch({
        query,
        results: finalResults,
        timestamp: new Date()
      });
      
      if (config.debugMode && gateway?.debugManager) {
        gateway.debugManager.info('Search completed', {
          query,
          resultsCount: finalResults.length,
          averageSimilarity: finalResults.reduce((sum, r) => sum + r.similarity, 0) / finalResults.length,
          responseTime: responseTime
        }, 'RAG', 'search');
      }
      
      return finalResults;
    } catch (error) {
      if (gateway?.debugManager) {
        gateway.debugManager.error('Search failed', { query, error }, 'RAG', 'search');
      }
      throw error;
    } finally {
      setIsSearching(false);
    }
  }, [config, generateEmbedding, gateway, rerankResults]);

  // Build context from search results
  const buildContext = useCallback((results: SearchResult[]): string => {
    if (results.length === 0) return '';
    
    const contextParts = results.map((result, index) => {
      let context = result.chunk.content;
      
      // Add surrounding context if available
      if (result.context.previousChunk) {
        context = result.context.previousChunk.content + ' ' + context;
      }
      if (result.context.nextChunk) {
        context = context + ' ' + result.context.nextChunk.content;
      }
      
      return `[${index + 1}] ${result.document.title}: ${context}`;
    });
    
    return contextParts.join('\n\n');
  }, []);

  // Expand context by including adjacent chunks
  const expandContext = useCallback(async (results: SearchResult[]): Promise<SearchResult[]> => {
    return results.map(result => {
      let expandedContent = result.chunk.content;
      
      // Add previous and next chunks for better context
      if (result.context.previousChunk) {
        expandedContent = result.context.previousChunk.content + ' ' + expandedContent;
      }
      if (result.context.nextChunk) {
        expandedContent = expandedContent + ' ' + result.context.nextChunk.content;
      }
      
      return {
        ...result,
        chunk: {
          ...result.chunk,
          content: expandedContent
        }
      };
    });
  }, []);

  // Semantic search with full context
  const semanticSearch = useCallback(async (
    query: string,
    options: {
      threshold?: number;
      maxResults?: number;
      includeContext?: boolean;
    } = {}
  ): Promise<RAGContext> => {
    const searchOptions = {
      threshold: options.threshold || config.similarityThreshold,
      maxResults: options.maxResults || config.maxResults,
      includeContext: options.includeContext !== false
    };
    
    // Temporarily update config for this search
    const originalConfig = { ...config };
    setConfig(prev => ({
      ...prev,
      similarityThreshold: searchOptions.threshold,
      maxResults: searchOptions.maxResults
    }));
    
    try {
      const results = await search(query);
      
      // Expand context if enabled
      let finalResults = results;
      if (config.enableContextExpansion && searchOptions.includeContext) {
        finalResults = await expandContext(results);
      }
      
      const formattedContext = buildContext(finalResults);
      const confidence = finalResults.length > 0 
        ? finalResults.reduce((sum, r) => sum + r.similarity, 0) / finalResults.length
        : 0;
      
      const sources = finalResults.map(result => ({
        documentId: result.document.id,
        title: result.document.title,
        relevance: result.similarity,
        snippet: result.chunk.content.substring(0, 200) + '...'
      }));
      
      return {
        query,
        results: finalResults,
        formattedContext,
        confidence,
        sources
      };
    } finally {
      // Restore original config
      setConfig(originalConfig);
    }
  }, [config, search, expandContext, buildContext]);

  // Format context with template
  const formatContext = useCallback((
    context: RAGContext, 
    template?: string
  ): string => {
    const defaultTemplate = `Based on the following information:\n\n{context}\n\nPlease answer: {query}`;
    const useTemplate = template || defaultTemplate;
    
    return useTemplate
      .replace('{context}', context.formattedContext)
      .replace('{query}', context.query)
      .replace('{confidence}', context.confidence.toFixed(2))
      .replace('{sources}', context.sources.map(s => s.title).join(', '));
  }, []);

  // Cache management
  const cacheEmbedding = useCallback((text: string, embedding: number[]) => {
    if (embeddingCache.current.size < config.cacheSize) {
      embeddingCache.current.set(text, embedding);
    }
  }, [config.cacheSize]);

  const getCachedEmbedding = useCallback((text: string): number[] | null => {
    return embeddingCache.current.get(text) || null;
  }, []);

  const clearEmbeddingCache = useCallback(() => {
    embeddingCache.current.clear();
    searchCache.current.clear();
  }, []);

  // Analytics
  const getSearchAnalytics = useCallback(() => {
    const popularQueries = searchAnalytics.queryHistory
      .reduce((acc, { query }) => {
        acc[query] = (acc[query] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    const sortedQueries = Object.entries(popularQueries)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));
    
    return {
      totalSearches: searchAnalytics.totalSearches,
      averageResponseTime: searchAnalytics.totalSearches > 0 
        ? searchAnalytics.totalResponseTime / searchAnalytics.totalSearches 
        : 0,
      cacheHitRate: searchAnalytics.totalSearches > 0 
        ? searchAnalytics.cacheHits / searchAnalytics.totalSearches 
        : 0,
      popularQueries: sortedQueries
    };
  }, [searchAnalytics]);

  const updateConfig = useCallback((updates: Partial<ConciergusRAGConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    // Configuration
    config,
    updateConfig,
    
    // Embedding Operations
    generateEmbedding,
    generateEmbeddings,
    
    // Search Operations
    search,
    semanticSearch,
    
    // Context Operations
    buildContext,
    formatContext,
    expandContext,
    
    // Reranking
    rerankResults,
    
    // Caching
    cacheEmbedding,
    getCachedEmbedding,
    clearEmbeddingCache,
    
    // Analytics
    getSearchAnalytics,
    
    // State
    isSearching,
    lastSearch
  };
}

// ============================================================================
// useConciergusKnowledge Hook
// ============================================================================

export interface ConciergusKnowledgeHookReturn {
  // Configuration
  config: ConciergusKnowledgeConfig;
  updateConfig: (updates: Partial<ConciergusKnowledgeConfig>) => void;
  
  // Knowledge Base Management
  knowledgeBases: KnowledgeBase[];
  createKnowledgeBase: (name: string, description: string, settings?: Partial<KnowledgeBase['settings']>) => Promise<string>;
  deleteKnowledgeBase: (id: string) => Promise<void>;
  updateKnowledgeBase: (id: string, updates: Partial<KnowledgeBase>) => Promise<void>;
  
  // Document Management
  addDocument: (knowledgeBaseId: string, document: Omit<KnowledgeDocument, 'id' | 'chunks' | 'embeddings' | 'isIndexed'>) => Promise<string>;
  removeDocument: (knowledgeBaseId: string, documentId: string) => Promise<void>;
  updateDocument: (knowledgeBaseId: string, documentId: string, updates: Partial<KnowledgeDocument>) => Promise<void>;
  getDocument: (knowledgeBaseId: string, documentId: string) => KnowledgeDocument | null;
  
  // Document Processing
  processDocument: (document: KnowledgeDocument) => Promise<DocumentChunk[]>;
  chunkDocument: (content: string, options?: { chunkSize?: number; overlap?: number }) => string[];
  
  // Indexing
  indexDocument: (knowledgeBaseId: string, documentId: string) => Promise<void>;
  indexKnowledgeBase: (id: string) => Promise<void>;
  reindexAll: () => Promise<void>;
  
  // Search Integration
  search: (query: string, knowledgeBaseId?: string) => Promise<SearchResult[]>;
  fullTextSearch: (query: string, knowledgeBaseId?: string) => Promise<KnowledgeDocument[]>;
  metadataSearch: (filters: Record<string, any>, knowledgeBaseId?: string) => Promise<KnowledgeDocument[]>;
  
  // Import/Export
  importDocuments: (knowledgeBaseId: string, documents: File[] | string[]) => Promise<string[]>;
  exportKnowledgeBase: (id: string, format: 'json' | 'csv' | 'markdown') => Promise<string | Blob>;
  
  // Analytics
  getKnowledgeAnalytics: (knowledgeBaseId?: string) => {
    totalDocuments: number;
    totalChunks: number;
    averageChunkSize: number;
    indexingProgress: number;
    lastUpdated: Date;
    popularDocuments: Array<{ id: string; title: string; accessCount: number }>;
  };
  
  // State
  isIndexing: boolean;
  indexingProgress: number;
  lastOperation: {
    type: string;
    status: 'success' | 'error' | 'pending';
    message: string;
    timestamp: Date;
  } | null;
}

export function useConciergusKnowledge(
  initialConfig: Partial<ConciergusKnowledgeConfig> = {}
): ConciergusKnowledgeHookReturn {
  const gateway = useGateway();
  const ragHook = useConciergusRAG();
  
  const [config, setConfig] = useState<ConciergusKnowledgeConfig>({
    maxDocuments: 1000,
    maxDocumentSize: 10 * 1024 * 1024, // 10MB
    supportedFormats: ['text', 'markdown', 'pdf', 'html', 'json'],
    autoIndexing: true,
    indexingBatchSize: 10,
    enableVersioning: true,
    enableFullTextSearch: true,
    enableMetadataSearch: true,
    retentionPeriod: 365,
    compressionEnabled: false,
    ...initialConfig
  });
  
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState(0);
  const [lastOperation, setLastOperation] = useState<{
    type: string;
    status: 'success' | 'error' | 'pending';
    message: string;
    timestamp: Date;
  } | null>(null);
  
  const [analytics, setAnalytics] = useState<Record<string, {
    documentAccess: Record<string, number>;
    lastAccessed: Record<string, Date>;
  }>>({});

  // Initialize knowledge bases from gateway
  useEffect(() => {
    const gatewayKnowledgeBases = gateway?.getKnowledgeBases?.();
    if (gatewayKnowledgeBases) {
      setKnowledgeBases(Object.values(gatewayKnowledgeBases));
    }
  }, [gateway]);

  // Create knowledge base
  const createKnowledgeBase = useCallback(async (
    name: string, 
    description: string, 
    settings?: Partial<KnowledgeBase['settings']>
  ): Promise<string> => {
    const id = `kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newKnowledgeBase: KnowledgeBase = {
      id,
      name,
      description,
      documents: [],
      settings: {
        embeddingModel: ragHook.config.embeddingModel,
        chunkSize: ragHook.config.chunkSize,
        chunkOverlap: ragHook.config.chunkOverlap,
        similarityThreshold: ragHook.config.similarityThreshold,
        maxResults: ragHook.config.maxResults,
        enableReranking: ragHook.config.enableReranking,
        ...settings
      },
      statistics: {
        totalDocuments: 0,
        totalChunks: 0,
        totalTokens: 0,
        lastUpdated: new Date(),
        indexingProgress: 0
      }
    };
    
    setKnowledgeBases(prev => [...prev, newKnowledgeBase]);
    
    // Store in gateway if available
    gateway?.addKnowledgeBase?.(id, newKnowledgeBase);
    
    setLastOperation({
      type: 'createKnowledgeBase',
      status: 'success',
      message: `Knowledge base "${name}" created successfully`,
      timestamp: new Date()
    });
    
    return id;
  }, [ragHook.config, gateway]);

  // Delete knowledge base
  const deleteKnowledgeBase = useCallback(async (id: string): Promise<void> => {
    setKnowledgeBases(prev => prev.filter(kb => kb.id !== id));
    gateway?.removeKnowledgeBase?.(id);
    
    setLastOperation({
      type: 'deleteKnowledgeBase',
      status: 'success',
      message: `Knowledge base deleted successfully`,
      timestamp: new Date()
    });
  }, [gateway]);

  // Update knowledge base
  const updateKnowledgeBase = useCallback(async (
    id: string, 
    updates: Partial<KnowledgeBase>
  ): Promise<void> => {
    setKnowledgeBases(prev => prev.map(kb => 
      kb.id === id ? { ...kb, ...updates } : kb
    ));
    
    gateway?.updateKnowledgeBase?.(id, updates);
    
    setLastOperation({
      type: 'updateKnowledgeBase',
      status: 'success',
      message: `Knowledge base updated successfully`,
      timestamp: new Date()
    });
  }, [gateway]);

  // Chunk document
  const chunkDocument = useCallback((
    content: string, 
    options: { chunkSize?: number; overlap?: number } = {}
  ): string[] => {
    const chunkSize = options.chunkSize || ragHook.config.chunkSize;
    const overlap = options.overlap || ragHook.config.chunkOverlap;
    
    if (!content || content.length === 0) return [];
    if (chunkSize <= 0) return [content];
    if (overlap >= chunkSize) return [content]; // Prevent infinite loop
    
    const chunks: string[] = [];
    let start = 0;
    
    while (start < content.length) {
      const end = Math.min(start + chunkSize, content.length);
      const chunk = content.slice(start, end).trim();
      
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
      
      // Move to next position
      if (end === content.length) {
        // We've reached the end
        break;
      }
      
      start = end - Math.min(overlap, end - 1);
      
      // Ensure we're making progress
      if (start <= 0) {
        start = 1;
      }
    }
    
    return chunks;
  }, [ragHook.config]);

  // Process document into chunks
  const processDocument = useCallback(async (
    document: KnowledgeDocument
  ): Promise<DocumentChunk[]> => {
    const chunks = chunkDocument(document.content);
    const embeddings = await ragHook.generateEmbeddings(chunks);
    
    return chunks.map((content, index) => ({
      id: `chunk_${document.id}_${index}`,
      content,
      embedding: embeddings[index],
      metadata: {
        documentId: document.id,
        chunkIndex: index,
        source: document.source,
        title: document.title,
        tags: document.metadata.tags,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }));
  }, [chunkDocument, ragHook.generateEmbeddings]);

  // Index document
  const indexDocument = useCallback(async (
    knowledgeBaseId: string, 
    documentId: string
  ): Promise<void> => {
    setIsIndexing(true);
    setIndexingProgress(0);
    
    try {
      const knowledgeBase = knowledgeBases.find(kb => kb.id === knowledgeBaseId);
      const document = knowledgeBase?.documents.find(doc => doc.id === documentId);
      
      if (!document) {
        throw new Error('Document not found');
      }
      
      setLastOperation({
        type: 'indexDocument',
        status: 'pending',
        message: `Indexing document "${document.title}"...`,
        timestamp: new Date()
      });
      
      // Process document into chunks
      const chunks = await processDocument(document);
      setIndexingProgress(50);
      
      // Update document with chunks and mark as indexed
      setKnowledgeBases(prev => prev.map(kb => 
        kb.id === knowledgeBaseId 
          ? {
              ...kb,
              documents: kb.documents.map(doc => 
                doc.id === documentId 
                  ? {
                      ...doc,
                      chunks,
                      embeddings: chunks.map(c => c.embedding),
                      isIndexed: true,
                      lastIndexed: new Date()
                    }
                  : doc
              ),
              statistics: {
                ...kb.statistics,
                totalChunks: kb.statistics.totalChunks + chunks.length,
                totalTokens: kb.statistics.totalTokens + chunks.reduce((sum, c) => sum + c.content.length, 0),
                lastUpdated: new Date()
              }
            }
          : kb
      ));
      
      setIndexingProgress(100);
      
      setLastOperation({
        type: 'indexDocument',
        status: 'success',
        message: `Document "${document.title}" indexed successfully`,
        timestamp: new Date()
      });
    } catch (error) {
      setLastOperation({
        type: 'indexDocument',
        status: 'error',
        message: `Failed to index document: ${error}`,
        timestamp: new Date()
      });
    } finally {
      setIsIndexing(false);
      setIndexingProgress(0);
    }
  }, [knowledgeBases, processDocument]);

  // Add document
  const addDocument = useCallback(async (
    knowledgeBaseId: string,
    document: Omit<KnowledgeDocument, 'id' | 'chunks' | 'embeddings' | 'isIndexed'>
  ): Promise<string> => {
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newDocument: KnowledgeDocument = {
      ...document,
      id: documentId,
      chunks: [],
      embeddings: [],
      isIndexed: false,
      metadata: {
        ...document.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        size: new Blob([document.content]).size
      }
    };
    
    setKnowledgeBases(prev => prev.map(kb => 
      kb.id === knowledgeBaseId 
        ? {
            ...kb,
            documents: [...kb.documents, newDocument],
            statistics: {
              ...kb.statistics,
              totalDocuments: kb.statistics.totalDocuments + 1,
              lastUpdated: new Date()
            }
          }
        : kb
    ));
    
    // Auto-index if enabled
    if (config.autoIndexing) {
      setTimeout(() => indexDocument(knowledgeBaseId, documentId), 100);
    }
    
    setLastOperation({
      type: 'addDocument',
      status: 'success',
      message: `Document "${document.title}" added successfully`,
      timestamp: new Date()
    });
    
    return documentId;
  }, [config.autoIndexing, indexDocument]);

  // Remove document
  const removeDocument = useCallback(async (
    knowledgeBaseId: string, 
    documentId: string
  ): Promise<void> => {
    setKnowledgeBases(prev => prev.map(kb => 
      kb.id === knowledgeBaseId 
        ? {
            ...kb,
            documents: kb.documents.filter(doc => doc.id !== documentId),
            statistics: {
              ...kb.statistics,
              totalDocuments: Math.max(0, kb.statistics.totalDocuments - 1),
              lastUpdated: new Date()
            }
          }
        : kb
    ));
    
    setLastOperation({
      type: 'removeDocument',
      status: 'success',
      message: `Document removed successfully`,
      timestamp: new Date()
    });
  }, []);

  // Update document
  const updateDocument = useCallback(async (
    knowledgeBaseId: string,
    documentId: string,
    updates: Partial<KnowledgeDocument>
  ): Promise<void> => {
    setKnowledgeBases(prev => prev.map(kb => 
      kb.id === knowledgeBaseId 
        ? {
            ...kb,
            documents: kb.documents.map(doc => 
              doc.id === documentId 
                ? {
                    ...doc,
                    ...updates,
                    metadata: {
                      ...doc.metadata,
                      ...updates.metadata,
                      updatedAt: new Date()
                    }
                  }
                : doc
            )
          }
        : kb
    ));
    
    // Re-index if content changed
    if (updates.content && config.autoIndexing) {
      setTimeout(() => indexDocument(knowledgeBaseId, documentId), 100);
    }
    
    setLastOperation({
      type: 'updateDocument',
      status: 'success',
      message: `Document updated successfully`,
      timestamp: new Date()
    });
  }, [config.autoIndexing, indexDocument]);

  // Get document
  const getDocument = useCallback((
    knowledgeBaseId: string, 
    documentId: string
  ): KnowledgeDocument | null => {
    const knowledgeBase = knowledgeBases.find(kb => kb.id === knowledgeBaseId);
    if (!knowledgeBase) return null;
    
    const document = knowledgeBase.documents.find(doc => doc.id === documentId);
    
    // Track access for analytics
    if (document) {
      setAnalytics(prev => ({
        ...prev,
        [knowledgeBaseId]: {
          ...prev[knowledgeBaseId],
          documentAccess: {
            ...prev[knowledgeBaseId]?.documentAccess,
            [documentId]: (prev[knowledgeBaseId]?.documentAccess?.[documentId] || 0) + 1
          },
          lastAccessed: {
            ...prev[knowledgeBaseId]?.lastAccessed,
            [documentId]: new Date()
          }
        }
      }));
    }
    
    return document || null;
  }, [knowledgeBases]);

  // Index entire knowledge base
  const indexKnowledgeBase = useCallback(async (id: string): Promise<void> => {
    const knowledgeBase = knowledgeBases.find(kb => kb.id === id);
    if (!knowledgeBase) {
      throw new Error('Knowledge base not found');
    }
    
    const unindexedDocuments = knowledgeBase.documents.filter(doc => !doc.isIndexed);
    
    for (let i = 0; i < unindexedDocuments.length; i++) {
      await indexDocument(id, unindexedDocuments[i].id);
      setIndexingProgress(((i + 1) / unindexedDocuments.length) * 100);
    }
  }, [knowledgeBases, indexDocument]);

  // Reindex all knowledge bases
  const reindexAll = useCallback(async (): Promise<void> => {
    for (const knowledgeBase of knowledgeBases) {
      await indexKnowledgeBase(knowledgeBase.id);
    }
  }, [knowledgeBases, indexKnowledgeBase]);

  // Search wrapper that uses RAG hook
  const search = useCallback(async (
    query: string, 
    knowledgeBaseId?: string
  ): Promise<SearchResult[]> => {
    return ragHook.search(query, knowledgeBaseId);
  }, [ragHook.search]);

  // Full text search
  const fullTextSearch = useCallback(async (
    query: string, 
    knowledgeBaseId?: string
  ): Promise<KnowledgeDocument[]> => {
    if (!config.enableFullTextSearch) {
      throw new Error('Full text search is disabled');
    }
    
    const queryTerms = query.toLowerCase().split(/\s+/);
    const targetBases = knowledgeBaseId 
      ? knowledgeBases.filter(kb => kb.id === knowledgeBaseId)
      : knowledgeBases;
    
    const results: KnowledgeDocument[] = [];
    
    for (const knowledgeBase of targetBases) {
      for (const document of knowledgeBase.documents) {
        const content = document.content.toLowerCase();
        const hasMatch = queryTerms.some(term => content.includes(term));
        
        if (hasMatch) {
          results.push(document);
        }
      }
    }
    
    return results;
  }, [config.enableFullTextSearch, knowledgeBases]);

  // Metadata search
  const metadataSearch = useCallback(async (
    filters: Record<string, any>, 
    knowledgeBaseId?: string
  ): Promise<KnowledgeDocument[]> => {
    if (!config.enableMetadataSearch) {
      throw new Error('Metadata search is disabled');
    }
    
    const targetBases = knowledgeBaseId 
      ? knowledgeBases.filter(kb => kb.id === knowledgeBaseId)
      : knowledgeBases;
    
    const results: KnowledgeDocument[] = [];
    
    for (const knowledgeBase of targetBases) {
      for (const document of knowledgeBase.documents) {
        let matches = true;
        
        for (const [key, value] of Object.entries(filters)) {
          const docValue = (document.metadata as any)[key];
          
          if (Array.isArray(docValue)) {
            if (!docValue.includes(value)) {
              matches = false;
              break;
            }
          } else if (docValue !== value) {
            matches = false;
            break;
          }
        }
        
        if (matches) {
          results.push(document);
        }
      }
    }
    
    return results;
  }, [config.enableMetadataSearch, knowledgeBases]);

  // Import documents
  const importDocuments = useCallback(async (
    knowledgeBaseId: string, 
    documents: File[] | string[]
  ): Promise<string[]> => {
    const documentIds: string[] = [];
    
    for (const doc of documents) {
      let content: string;
      let title: string;
      let format: KnowledgeDocument['format'];
      
      if (typeof doc === 'string') {
        content = doc;
        title = `Imported Document ${Date.now()}`;
        format = 'text';
      } else {
        // Handle File object
        content = await doc.text();
        title = doc.name;
        format = doc.type.includes('json') ? 'json' : 
                 doc.type.includes('html') ? 'html' :
                 doc.name.endsWith('.md') ? 'markdown' : 'text';
      }
      
      const documentId = await addDocument(knowledgeBaseId, {
        title,
        content,
        source: typeof doc === 'string' ? 'import' : doc.name,
        format,
        metadata: {
          tags: [],
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          size: content.length
        }
      });
      
      documentIds.push(documentId);
    }
    
    return documentIds;
  }, [addDocument]);

  // Export knowledge base
  const exportKnowledgeBase = useCallback(async (
    id: string, 
    format: 'json' | 'csv' | 'markdown'
  ): Promise<string | Blob> => {
    const knowledgeBase = knowledgeBases.find(kb => kb.id === id);
    if (!knowledgeBase) {
      throw new Error('Knowledge base not found');
    }
    
    switch (format) {
      case 'json':
        return JSON.stringify(knowledgeBase, null, 2);
        
      case 'csv':
        const csvHeader = 'ID,Title,Content,Source,Format,Tags,Created,Updated\n';
        const csvRows = knowledgeBase.documents.map(doc => [
          doc.id,
          doc.title,
          doc.content.replace(/"/g, '""'),
          doc.source,
          doc.format,
          doc.metadata.tags.join(';'),
          doc.metadata.createdAt.toISOString(),
          doc.metadata.updatedAt.toISOString()
        ].map(field => `"${field}"`).join(',')).join('\n');
        return csvHeader + csvRows;
        
      case 'markdown':
        const markdown = knowledgeBase.documents.map(doc => 
          `# ${doc.title}\n\n${doc.content}\n\n---\n\n`
        ).join('');
        return markdown;
        
      default:
        throw new Error('Unsupported export format');
    }
  }, [knowledgeBases]);

  // Get analytics
  const getKnowledgeAnalytics = useCallback((knowledgeBaseId?: string) => {
    const targetBases = knowledgeBaseId 
      ? knowledgeBases.filter(kb => kb.id === knowledgeBaseId)
      : knowledgeBases;
    
    const totalDocuments = targetBases.reduce((sum, kb) => sum + kb.statistics.totalDocuments, 0);
    const totalChunks = targetBases.reduce((sum, kb) => sum + kb.statistics.totalChunks, 0);
    const averageChunkSize = totalChunks > 0 
      ? targetBases.reduce((sum, kb) => sum + kb.statistics.totalTokens, 0) / totalChunks 
      : 0;
    
    const lastUpdated = targetBases.reduce((latest, kb) => 
      kb.statistics.lastUpdated > latest ? kb.statistics.lastUpdated : latest, 
      new Date(0)
    );
    
    const popularDocuments: Array<{ id: string; title: string; accessCount: number }> = [];
    
    for (const knowledgeBase of targetBases) {
      const baseAnalytics = analytics[knowledgeBase.id];
      if (baseAnalytics) {
        for (const [docId, accessCount] of Object.entries(baseAnalytics.documentAccess)) {
          const document = knowledgeBase.documents.find(doc => doc.id === docId);
          if (document) {
            popularDocuments.push({
              id: docId,
              title: document.title,
              accessCount
            });
          }
        }
      }
    }
    
    popularDocuments.sort((a, b) => b.accessCount - a.accessCount);
    
    return {
      totalDocuments,
      totalChunks,
      averageChunkSize,
      indexingProgress: isIndexing ? indexingProgress : 100,
      lastUpdated,
      popularDocuments: popularDocuments.slice(0, 10)
    };
  }, [knowledgeBases, analytics, isIndexing, indexingProgress]);

  const updateConfig = useCallback((updates: Partial<ConciergusKnowledgeConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    // Configuration
    config,
    updateConfig,
    
    // Knowledge Base Management
    knowledgeBases,
    createKnowledgeBase,
    deleteKnowledgeBase,
    updateKnowledgeBase,
    
    // Document Management
    addDocument,
    removeDocument,
    updateDocument,
    getDocument,
    
    // Document Processing
    processDocument,
    chunkDocument,
    
    // Indexing
    indexDocument,
    indexKnowledgeBase,
    reindexAll,
    
    // Search Integration
    search,
    fullTextSearch,
    metadataSearch,
    
    // Import/Export
    importDocuments,
    exportKnowledgeBase,
    
    // Analytics
    getKnowledgeAnalytics,
    
    // State
    isIndexing,
    indexingProgress,
    lastOperation
  };
}

export default { useConciergusRAG, useConciergusKnowledge }; 

// Utility function for cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

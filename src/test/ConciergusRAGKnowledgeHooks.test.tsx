import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { 
  useConciergusRAG, 
  useConciergusKnowledge,
  type ConciergusRAGConfig,
  type ConciergusKnowledgeConfig,
  type DocumentChunk,
  type KnowledgeDocument,
  type SearchResult,
  type RAGContext
} from '../context/ConciergusRAGKnowledgeHooks';
import { GatewayProvider } from '../context/GatewayProvider';
import { ConciergusProvider } from '../context/ConciergusProvider';

// Mock AI SDK functions
jest.mock('ai', () => ({
  embed: jest.fn(),
  embedMany: jest.fn(),
  cosineSimilarity: jest.fn()
}));

import { embed, embedMany, cosineSimilarity } from 'ai';

const mockEmbed = embed as jest.MockedFunction<typeof embed>;
const mockEmbedMany = embedMany as jest.MockedFunction<typeof embedMany>;
const mockCosineSimilarity = cosineSimilarity as jest.MockedFunction<typeof cosineSimilarity>;

// Mock gateway for testing
const mockGateway = {
  getEmbeddingModel: jest.fn(() => ({
    id: 'text-embedding-3-small',
    provider: 'openai'
  })),
  createEmbeddingModel: jest.fn((modelId: string) => ({
    id: modelId,
    provider: 'openai'
  })),
  getKnowledgeBases: jest.fn(() => ({
    'kb_test': {
      id: 'kb_test',
      name: 'Test Knowledge Base',
      description: 'Test KB',
      documents: [
        {
          id: 'doc_1',
          title: 'Test Document',
          content: 'This is test content for document one.',
          source: 'test',
          format: 'text',
          metadata: {
            tags: ['test'],
            version: 1,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            size: 100
          },
          chunks: [
            {
              id: 'chunk_1',
              content: 'This is test content for document one.',
              embedding: [0.1, 0.2, 0.3],
              metadata: {
                documentId: 'doc_1',
                chunkIndex: 0,
                source: 'test',
                title: 'Test Document',
                tags: ['test'],
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01')
              }
            }
          ],
          embeddings: [[0.1, 0.2, 0.3]],
          isIndexed: true,
          lastIndexed: new Date('2024-01-01')
        }
      ],
      settings: {
        embeddingModel: 'text-embedding-3-small',
        chunkSize: 1000,
        chunkOverlap: 200,
        similarityThreshold: 0.7,
        maxResults: 5,
        enableReranking: false
      },
      statistics: {
        totalDocuments: 1,
        totalChunks: 1,
        totalTokens: 100,
        lastUpdated: new Date('2024-01-01'),
        indexingProgress: 100
      }
    }
  })),
  addKnowledgeBase: jest.fn(),
  removeKnowledgeBase: jest.fn(),
  updateKnowledgeBase: jest.fn(),
  debugManager: {
    info: jest.fn(),
    error: jest.fn()
  }
};

jest.mock('../context/GatewayProvider', () => ({
  useGateway: () => mockGateway,
  GatewayProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ConciergusProvider>
    <GatewayProvider>
      {children}
    </GatewayProvider>
  </ConciergusProvider>
);

describe('useConciergusRAG', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockEmbed.mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
      usage: { tokens: 10 }
    });
    
    mockEmbedMany.mockResolvedValue({
      embeddings: [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]],
      usage: { tokens: 20 }
    });
    
    mockCosineSimilarity.mockReturnValue(0.85);
  });

  it('should initialize with default configuration', () => {
    const { result } = renderHook(() => useConciergusRAG(), {
      wrapper: TestWrapper
    });

    expect(result.current.config).toMatchObject({
      embeddingModel: 'text-embedding-3-small',
      chunkSize: 1000,
      chunkOverlap: 200,
      similarityThreshold: 0.7,
      maxResults: 5,
      enableContextExpansion: true,
      enableReranking: false,
      enableCaching: true,
      cacheSize: 1000,
      debugMode: false
    });
  });

  it('should initialize with custom configuration', () => {
    const customConfig: Partial<ConciergusRAGConfig> = {
      chunkSize: 500,
      similarityThreshold: 0.8,
      enableReranking: true
    };

    const { result } = renderHook(() => useConciergusRAG(customConfig), {
      wrapper: TestWrapper
    });

    expect(result.current.config.chunkSize).toBe(500);
    expect(result.current.config.similarityThreshold).toBe(0.8);
    expect(result.current.config.enableReranking).toBe(true);
  });

  it('should generate single embedding', async () => {
    const { result } = renderHook(() => useConciergusRAG(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      const embedding = await result.current.generateEmbedding('test text');
      expect(embedding).toEqual([0.1, 0.2, 0.3]);
    });

    expect(mockEmbed).toHaveBeenCalledWith({
      model: expect.objectContaining({ id: 'text-embedding-3-small' }),
      value: 'test text'
    });
  });

  it('should generate multiple embeddings', async () => {
    const { result } = renderHook(() => useConciergusRAG(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      const embeddings = await result.current.generateEmbeddings(['text 1', 'text 2']);
      expect(embeddings).toEqual([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]);
    });

    expect(mockEmbedMany).toHaveBeenCalledWith({
      model: expect.objectContaining({ id: 'text-embedding-3-small' }),
      values: ['text 1', 'text 2']
    });
  });

  it('should cache embeddings when caching is enabled', async () => {
    const { result } = renderHook(() => useConciergusRAG(), {
      wrapper: TestWrapper
    });

    const testText = 'test text for caching';

    // First call should generate embedding
    await act(async () => {
      await result.current.generateEmbedding(testText);
    });

    expect(mockEmbed).toHaveBeenCalledTimes(1);

    // Second call should use cache
    await act(async () => {
      const embedding = await result.current.generateEmbedding(testText);
      expect(embedding).toEqual([0.1, 0.2, 0.3]);
    });

    expect(mockEmbed).toHaveBeenCalledTimes(1); // No additional call
  });

  it('should perform semantic search', async () => {
    const { result } = renderHook(() => useConciergusRAG(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      const results = await result.current.search('test query');
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        similarity: 0.85,
        document: expect.objectContaining({ id: 'doc_1' }),
        chunk: expect.objectContaining({ id: 'chunk_1' })
      });
    });

    expect(mockEmbed).toHaveBeenCalled();
    expect(mockCosineSimilarity).toHaveBeenCalled();
  });

  it('should perform enhanced semantic search with context', async () => {
    const { result } = renderHook(() => useConciergusRAG(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      const context = await result.current.semanticSearch('test query', {
        threshold: 0.6,
        maxResults: 3,
        includeContext: true
      });

      expect(context).toMatchObject({
        query: 'test query',
        results: expect.any(Array),
        formattedContext: expect.any(String),
        confidence: expect.any(Number),
        sources: expect.any(Array)
      });
    });
  });

  it('should build context from search results', () => {
    const { result } = renderHook(() => useConciergusRAG(), {
      wrapper: TestWrapper
    });

    const mockResults: SearchResult[] = [
      {
        chunk: {
          id: 'chunk_1',
          content: 'First chunk content',
          embedding: [0.1, 0.2, 0.3],
          metadata: {
            documentId: 'doc_1',
            chunkIndex: 0,
            source: 'test',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        },
        similarity: 0.9,
        relevanceScore: 0.9,
        document: {
          id: 'doc_1',
          title: 'Test Document',
          content: 'Full content',
          source: 'test',
          format: 'text',
          metadata: {
            tags: [],
            version: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            size: 100
          },
          chunks: [],
          embeddings: [],
          isIndexed: true
        },
        context: {}
      }
    ];

    const context = result.current.buildContext(mockResults);
    expect(context).toContain('Test Document');
    expect(context).toContain('First chunk content');
  });

  it('should format context with template', () => {
    const { result } = renderHook(() => useConciergusRAG(), {
      wrapper: TestWrapper
    });

    const mockContext: RAGContext = {
      query: 'test query',
      results: [],
      formattedContext: 'test context',
      confidence: 0.85,
      sources: [{ documentId: 'doc_1', title: 'Test Doc', relevance: 0.9, snippet: 'snippet' }]
    };

    const formatted = result.current.formatContext(mockContext, 'Query: {query}\nContext: {context}');
    expect(formatted).toBe('Query: test query\nContext: test context');
  });

  it('should manage embedding cache', () => {
    const { result } = renderHook(() => useConciergusRAG(), {
      wrapper: TestWrapper
    });

    const testEmbedding = [0.1, 0.2, 0.3];
    
    // Cache embedding
    act(() => {
      result.current.cacheEmbedding('test text', testEmbedding);
    });

    // Retrieve cached embedding
    const cached = result.current.getCachedEmbedding('test text');
    expect(cached).toEqual(testEmbedding);

    // Clear cache
    act(() => {
      result.current.clearEmbeddingCache();
    });

    const clearedCache = result.current.getCachedEmbedding('test text');
    expect(clearedCache).toBeNull();
  });

  it('should provide search analytics', async () => {
    const { result } = renderHook(() => useConciergusRAG(), {
      wrapper: TestWrapper
    });

    // Perform some searches
    await act(async () => {
      await result.current.search('query 1');
      await result.current.search('query 2');
      await result.current.search('query 1'); // Repeat query
    });

    const analytics = result.current.getSearchAnalytics();
    expect(analytics.totalSearches).toBe(3);
    expect(analytics.popularQueries).toContainEqual({
      query: 'query 1',
      count: 2
    });
  });

  it('should update configuration', () => {
    const { result } = renderHook(() => useConciergusRAG(), {
      wrapper: TestWrapper
    });

    act(() => {
      result.current.updateConfig({
        chunkSize: 2000,
        enableReranking: true
      });
    });

    expect(result.current.config.chunkSize).toBe(2000);
    expect(result.current.config.enableReranking).toBe(true);
  });

  it('should handle embedding errors gracefully', async () => {
    mockEmbed.mockRejectedValueOnce(new Error('Embedding failed'));

    const { result } = renderHook(() => useConciergusRAG(), {
      wrapper: TestWrapper
    });

    await expect(
      result.current.generateEmbedding('test text')
    ).rejects.toThrow('Embedding failed');

    expect(mockGateway.debugManager.error).toHaveBeenCalled();
  });

  it('should track search state correctly', async () => {
    const { result } = renderHook(() => useConciergusRAG(), {
      wrapper: TestWrapper
    });

    expect(result.current.isSearching).toBe(false);
    expect(result.current.lastSearch).toBeNull();

    const searchPromise = act(async () => {
      await result.current.search('test query');
    });

    await searchPromise;

    expect(result.current.lastSearch).toMatchObject({
      query: 'test query',
      results: expect.any(Array),
      timestamp: expect.any(Date)
    });
  });
});

describe('useConciergusKnowledge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default configuration', () => {
    const { result } = renderHook(() => useConciergusKnowledge(), {
      wrapper: TestWrapper
    });

    expect(result.current.config).toMatchObject({
      maxDocuments: 1000,
      maxDocumentSize: 10 * 1024 * 1024,
      supportedFormats: ['text', 'markdown', 'pdf', 'html', 'json'],
      autoIndexing: true,
      indexingBatchSize: 10,
      enableVersioning: true,
      enableFullTextSearch: true,
      enableMetadataSearch: true,
      retentionPeriod: 365,
      compressionEnabled: false
    });
  });

  it('should load knowledge bases from gateway', () => {
    const { result } = renderHook(() => useConciergusKnowledge(), {
      wrapper: TestWrapper
    });

    expect(result.current.knowledgeBases).toHaveLength(1);
    expect(result.current.knowledgeBases[0]).toMatchObject({
      id: 'kb_test',
      name: 'Test Knowledge Base'
    });
  });

  it('should create new knowledge base', async () => {
    const { result } = renderHook(() => useConciergusKnowledge(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      const id = await result.current.createKnowledgeBase(
        'New KB',
        'Description for new KB'
      );
      
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^kb_/);
    });

    expect(result.current.knowledgeBases).toHaveLength(2);
    expect(mockGateway.addKnowledgeBase).toHaveBeenCalled();
  });

  it('should delete knowledge base', async () => {
    const { result } = renderHook(() => useConciergusKnowledge(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      await result.current.deleteKnowledgeBase('kb_test');
    });

    expect(result.current.knowledgeBases).toHaveLength(0);
    expect(mockGateway.removeKnowledgeBase).toHaveBeenCalledWith('kb_test');
  });

  it('should add document to knowledge base', async () => {
    const { result } = renderHook(() => useConciergusKnowledge(), {
      wrapper: TestWrapper
    });

    const newDocument = {
      title: 'New Document',
      content: 'This is new document content.',
      source: 'test',
      format: 'text' as const,
      metadata: {
        tags: ['new'],
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        size: 100
      }
    };

    await act(async () => {
      const docId = await result.current.addDocument('kb_test', newDocument);
      expect(typeof docId).toBe('string');
      expect(docId).toMatch(/^doc_/);
    });

    const kb = result.current.knowledgeBases.find(kb => kb.id === 'kb_test');
    expect(kb?.documents).toHaveLength(2);
  });

  it('should remove document from knowledge base', async () => {
    const { result } = renderHook(() => useConciergusKnowledge(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      await result.current.removeDocument('kb_test', 'doc_1');
    });

    const kb = result.current.knowledgeBases.find(kb => kb.id === 'kb_test');
    expect(kb?.documents).toHaveLength(0);
  });

  it('should get document and track access', () => {
    const { result } = renderHook(() => useConciergusKnowledge(), {
      wrapper: TestWrapper
    });

    const document = result.current.getDocument('kb_test', 'doc_1');
    expect(document).toMatchObject({
      id: 'doc_1',
      title: 'Test Document'
    });

    // Check analytics
    const analytics = result.current.getKnowledgeAnalytics('kb_test');
    expect(analytics.popularDocuments).toContainEqual({
      id: 'doc_1',
      title: 'Test Document',
      accessCount: 1
    });
  });

  it('should chunk document content', () => {
    const { result } = renderHook(() => useConciergusKnowledge(), {
      wrapper: TestWrapper
    });

    const content = 'This is a long document. '.repeat(100); // Create long content
    const chunks = result.current.chunkDocument(content, {
      chunkSize: 50,
      overlap: 10
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].length).toBeLessThanOrEqual(50);
  });

  it('should process document into chunks with embeddings', async () => {
    mockEmbedMany.mockResolvedValueOnce({
      embeddings: [[0.1, 0.2], [0.3, 0.4]],
      usage: { tokens: 20 }
    });

    const { result } = renderHook(() => useConciergusKnowledge(), {
      wrapper: TestWrapper
    });

    const mockDocument: KnowledgeDocument = {
      id: 'test_doc',
      title: 'Test',
      content: 'Short content that will be chunked into multiple parts for testing.',
      source: 'test',
      format: 'text',
      metadata: {
        tags: [],
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        size: 100
      },
      chunks: [],
      embeddings: [],
      isIndexed: false
    };

    await act(async () => {
      const chunks = await result.current.processDocument(mockDocument);
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toMatchObject({
        id: expect.stringMatching(/^chunk_test_doc_/),
        content: expect.any(String),
        embedding: expect.any(Array),
        metadata: expect.objectContaining({
          documentId: 'test_doc',
          chunkIndex: expect.any(Number)
        })
      });
    });
  });

  it('should index document', async () => {
    mockEmbedMany.mockResolvedValueOnce({
      embeddings: [[0.1, 0.2]],
      usage: { tokens: 10 }
    });

    const { result } = renderHook(() => useConciergusKnowledge(), {
      wrapper: TestWrapper
    });

    // First add a document
    await act(async () => {
      await result.current.addDocument('kb_test', {
        title: 'Unindexed Doc',
        content: 'Content to be indexed.',
        source: 'test',
        format: 'text',
        metadata: {
          tags: [],
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          size: 50
        }
      });
    });

    const kb = result.current.knowledgeBases.find(kb => kb.id === 'kb_test');
    const unindexedDoc = kb?.documents.find(doc => !doc.isIndexed);

    if (unindexedDoc) {
      await act(async () => {
        await result.current.indexDocument('kb_test', unindexedDoc.id);
      });

      const updatedKb = result.current.knowledgeBases.find(kb => kb.id === 'kb_test');
      const indexedDoc = updatedKb?.documents.find(doc => doc.id === unindexedDoc.id);
      expect(indexedDoc?.isIndexed).toBe(true);
      expect(indexedDoc?.chunks.length).toBeGreaterThan(0);
    }
  });

  it('should perform full text search', async () => {
    const { result } = renderHook(() => useConciergusKnowledge(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      const results = await result.current.fullTextSearch('test');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('doc_1');
    });
  });

  it('should perform metadata search', async () => {
    const { result } = renderHook(() => useConciergusKnowledge(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      const results = await result.current.metadataSearch({ tags: 'test' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('doc_1');
    });
  });

  it('should import documents', async () => {
    const { result } = renderHook(() => useConciergusKnowledge(), {
      wrapper: TestWrapper
    });

    const documents = [
      'First imported document content',
      'Second imported document content'
    ];

    await act(async () => {
      const documentIds = await result.current.importDocuments('kb_test', documents);
      expect(documentIds).toHaveLength(2);
      expect(documentIds.every(id => id.startsWith('doc_'))).toBe(true);
    });

    const kb = result.current.knowledgeBases.find(kb => kb.id === 'kb_test');
    expect(kb?.documents).toHaveLength(3); // Original + 2 imported
  });

  it('should export knowledge base in different formats', async () => {
    const { result } = renderHook(() => useConciergusKnowledge(), {
      wrapper: TestWrapper
    });

    // Test JSON export
    await act(async () => {
      const jsonExport = await result.current.exportKnowledgeBase('kb_test', 'json');
      expect(typeof jsonExport).toBe('string');
      const parsed = JSON.parse(jsonExport as string);
      expect(parsed.id).toBe('kb_test');
    });

    // Test CSV export
    await act(async () => {
      const csvExport = await result.current.exportKnowledgeBase('kb_test', 'csv');
      expect(typeof csvExport).toBe('string');
      expect(csvExport).toContain('ID,Title,Content');
    });

    // Test Markdown export
    await act(async () => {
      const mdExport = await result.current.exportKnowledgeBase('kb_test', 'markdown');
      expect(typeof mdExport).toBe('string');
      expect(mdExport).toContain('# Test Document');
    });
  });

  it('should provide knowledge analytics', () => {
    const { result } = renderHook(() => useConciergusKnowledge(), {
      wrapper: TestWrapper
    });

    const analytics = result.current.getKnowledgeAnalytics('kb_test');
    expect(analytics).toMatchObject({
      totalDocuments: 1,
      totalChunks: 1,
      averageChunkSize: expect.any(Number),
      indexingProgress: expect.any(Number),
      lastUpdated: expect.any(Date),
      popularDocuments: expect.any(Array)
    });
  });

  it('should update configuration', () => {
    const { result } = renderHook(() => useConciergusKnowledge(), {
      wrapper: TestWrapper
    });

    act(() => {
      result.current.updateConfig({
        maxDocuments: 2000,
        autoIndexing: false
      });
    });

    expect(result.current.config.maxDocuments).toBe(2000);
    expect(result.current.config.autoIndexing).toBe(false);
  });

  it('should handle indexing state correctly', async () => {
    const { result } = renderHook(() => useConciergusKnowledge(), {
      wrapper: TestWrapper
    });

    expect(result.current.isIndexing).toBe(false);
    expect(result.current.indexingProgress).toBe(0);

    // The indexing state is managed internally during indexDocument operations
    // This test ensures the state is properly initialized
  });

  it('should track last operation', async () => {
    const { result } = renderHook(() => useConciergusKnowledge(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      await result.current.createKnowledgeBase('Test KB', 'Test description');
    });

    expect(result.current.lastOperation).toMatchObject({
      type: 'createKnowledgeBase',
      status: 'success',
      message: expect.stringContaining('Test KB'),
      timestamp: expect.any(Date)
    });
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEmbed.mockResolvedValue({ embedding: [0.1, 0.2, 0.3], usage: { tokens: 10 } });
    mockCosineSimilarity.mockReturnValue(0.85);
  });

  it('should work together for RAG pipeline', async () => {
    const { result: ragResult } = renderHook(() => useConciergusRAG(), {
      wrapper: TestWrapper
    });
    const { result: knowledgeResult } = renderHook(() => useConciergusKnowledge(), {
      wrapper: TestWrapper
    });

    // Create knowledge base
    let kbId: string;
    await act(async () => {
      kbId = await knowledgeResult.current.createKnowledgeBase(
        'Integration Test KB',
        'Test knowledge base for integration'
      );
    });

    // Add document
    let docId: string;
    await act(async () => {
      docId = await knowledgeResult.current.addDocument(kbId, {
        title: 'Integration Test Doc',
        content: 'This document contains information about testing integrations.',
        source: 'test',
        format: 'text',
        metadata: {
          tags: ['integration', 'test'],
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          size: 100
        }
      });
    });

    // Search using RAG
    await act(async () => {
      const results = await ragResult.current.search('integration testing');
      expect(results).toBeDefined();
    });

    // Verify knowledge base integration
    expect(knowledgeResult.current.knowledgeBases.length).toBeGreaterThan(0);
  });

  it('should handle complex RAG workflow with context expansion', async () => {
    const { result: ragResult } = renderHook(() => 
      useConciergusRAG({ enableContextExpansion: true }), {
      wrapper: TestWrapper
    });

    await act(async () => {
      const context = await ragResult.current.semanticSearch('test query', {
        includeContext: true,
        maxResults: 3
      });

      expect(context.query).toBe('test query');
      expect(context.formattedContext).toBeDefined();
      expect(context.confidence).toBeGreaterThan(0);
      expect(context.sources).toBeDefined();
    });
  });

  it('should maintain performance analytics across operations', async () => {
    const { result: ragResult } = renderHook(() => useConciergusRAG(), {
      wrapper: TestWrapper
    });
    const { result: knowledgeResult } = renderHook(() => useConciergusKnowledge(), {
      wrapper: TestWrapper
    });

    // Perform multiple operations
    await act(async () => {
      await ragResult.current.search('query 1');
      await ragResult.current.search('query 2');
      knowledgeResult.current.getDocument('kb_test', 'doc_1');
      knowledgeResult.current.getDocument('kb_test', 'doc_1'); // Access again
    });

    const ragAnalytics = ragResult.current.getSearchAnalytics();
    const knowledgeAnalytics = knowledgeResult.current.getKnowledgeAnalytics();

    expect(ragAnalytics.totalSearches).toBe(2);
    expect(knowledgeAnalytics.popularDocuments[0].accessCount).toBe(2);
  });
}); 
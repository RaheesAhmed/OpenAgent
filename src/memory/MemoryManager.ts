/**
 * Core Memory Manager for OpenClaude
 * Implements persistent, never-forget memory with intelligent retrieval
 */

import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';
import fs from 'fs-extra';
import * as path from 'path';
import CryptoJS from 'crypto-js';
import {
  MemoryConfig,
  MemoryRecord,
  MemoryType,
  MemoryQuery,
  MemorySearchResult,
  MemoryStats,
  MemoryContext,
  MemoryOptimization,
  MemoryHealthStatus,
  MemoryMetadata
} from './types.js';

export class MemoryManager {
  private db: Database | null = null;
  private config: MemoryConfig;
  private context: MemoryContext;
  private cache: Map<string, MemoryRecord> = new Map();
  private embedding_cache: Map<string, number[]> = new Map();
  private isInitialized: boolean = false;
  private retrievalTimes: number[] = [];
  private maxRetrievalSamples: number = 1000;

  constructor(config: MemoryConfig, context: MemoryContext) {
    this.config = config;
    this.context = context;
  }

  /**
   * Initialize the memory system
   */
  async initialize(): Promise<void> {
    try {
      // Ensure database directory exists
      const dbDir = path.dirname(this.config.databasePath);
      await fs.ensureDir(dbDir);

      // Initialize SQLite database
      await this.initializeDatabase();
      
      // Create tables if they don't exist
      await this.createTables();
      
      // Load recent memories into cache
      await this.loadInitialCache();
      
      // Perform health check
      await this.performHealthCheck();

      this.isInitialized = true;
      //console.log('✅ Memory system initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize memory system:', error);
      throw error;
    }
  }

  /**
   * Initialize SQLite database connection
   */
  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.config.databasePath, (err) => {
        if (err) {
          reject(err);
        } else {
          // Enable foreign keys
          this.db!.run('PRAGMA foreign_keys = ON', (err) => {
            if (err) reject(err);
            else resolve();
          });
        }
      });
    });
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    const createTableQueries = [
      `
        CREATE TABLE IF NOT EXISTS memories (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          content TEXT NOT NULL,
          metadata TEXT NOT NULL,
          embedding TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          last_accessed INTEGER NOT NULL,
          access_count INTEGER DEFAULT 0,
          importance REAL DEFAULT 0.5,
          tags TEXT NOT NULL,
          associated_files TEXT NOT NULL,
          session_id TEXT NOT NULL,
          project_id TEXT NOT NULL,
          checksum TEXT,
          archived INTEGER DEFAULT 0
        )
      `,
      `
        CREATE TABLE IF NOT EXISTS memory_relationships (
          id TEXT PRIMARY KEY,
          source_id TEXT NOT NULL,
          target_id TEXT NOT NULL,
          relationship_type TEXT NOT NULL,
          strength REAL NOT NULL,
          metadata TEXT,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (source_id) REFERENCES memories (id) ON DELETE CASCADE,
          FOREIGN KEY (target_id) REFERENCES memories (id) ON DELETE CASCADE
        )
      `,
      `
        CREATE TABLE IF NOT EXISTS learning_patterns (
          id TEXT PRIMARY KEY,
          pattern TEXT NOT NULL,
          category TEXT NOT NULL,
          frequency INTEGER DEFAULT 0,
          success_rate REAL DEFAULT 0.0,
          last_reinforced INTEGER NOT NULL,
          context TEXT NOT NULL,
          examples TEXT NOT NULL,
          confidence REAL DEFAULT 0.0
        )
      `,
      `
        CREATE TABLE IF NOT EXISTS user_behavior (
          id TEXT PRIMARY KEY,
          profile_data TEXT NOT NULL,
          updated_at INTEGER NOT NULL,
          version INTEGER DEFAULT 1
        )
      `,
      `
        CREATE TABLE IF NOT EXISTS memory_stats (
          id TEXT PRIMARY KEY,
          stats_data TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )
      `
    ];

    for (const query of createTableQueries) {
      await this.runQuery(query);
    }

    // Create indexes for performance
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_memories_type ON memories (type)',
      'CREATE INDEX IF NOT EXISTS idx_memories_project ON memories (project_id)',
      'CREATE INDEX IF NOT EXISTS idx_memories_session ON memories (session_id)',
      'CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories (importance)',
      'CREATE INDEX IF NOT EXISTS idx_memories_created ON memories (created_at)',
      'CREATE INDEX IF NOT EXISTS idx_memories_accessed ON memories (last_accessed)',
      'CREATE INDEX IF NOT EXISTS idx_relationships_source ON memory_relationships (source_id)',
      'CREATE INDEX IF NOT EXISTS idx_relationships_target ON memory_relationships (target_id)'
    ];

    for (const query of indexQueries) {
      await this.runQuery(query);
    }
  }

  /**
   * Store a memory record
   */
  async storeMemory(
    type: MemoryType,
    content: string,
    metadata: Partial<MemoryMetadata> = {},
    importance: number = 0.5,
    tags: string[] = []
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Memory system not initialized');
    }

    const id = this.generateId();
    const now = Date.now();
    const embedding = await this.generateEmbedding(content);
    const checksum = this.generateChecksum(content);

    const record: MemoryRecord = {
      id,
      type,
      content,
      metadata: {
        source: metadata.source || 'user',
        confidence: metadata.confidence || 0.8,
        relevance: metadata.relevance || 0.5,
        context: metadata.context || {},
        relationships: metadata.relationships || [],
        checksum
      },
      embedding,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      lastAccessed: new Date(now),
      accessCount: 1,
      importance,
      tags,
      associatedFiles: this.context.activeFiles || [],
      sessionId: this.context.currentSession,
      projectId: this.context.currentProject
    };

    // Store in database
    await this.runQuery(
      `INSERT INTO memories (
        id, type, content, metadata, embedding, created_at, updated_at,
        last_accessed, access_count, importance, tags, associated_files,
        session_id, project_id, checksum
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, type, content, JSON.stringify(record.metadata),
        JSON.stringify(embedding), now, now, now, 1, importance,
        JSON.stringify(tags), JSON.stringify(record.associatedFiles),
        record.sessionId, record.projectId, checksum
      ]
    );

    // Cache the record
    this.cache.set(id, record);

    // Store relationships if provided
    if (record.metadata.relationships.length > 0) {
      await this.storeRelationships(id, record.metadata.relationships);
    }

    // Update learning patterns
    await this.updateLearningPatterns(type, content, tags);

    return id;
  }

  /**
   * Search memories using text and semantic similarity
   */
  async searchMemories(query: MemoryQuery): Promise<MemorySearchResult[]> {
    const startTime = Date.now();
    
    if (!this.isInitialized) {
      throw new Error('Memory system not initialized');
    }

    let sql = 'SELECT * FROM memories WHERE archived = 0';
    const params: any[] = [];

    // Build query conditions
    if (query.type) {
      sql += ' AND type = ?';
      params.push(query.type);
    }

    if (query.projectId) {
      sql += ' AND project_id = ?';
      params.push(query.projectId);
    }

    if (query.sessionId) {
      sql += ' AND session_id = ?';
      params.push(query.sessionId);
    }

    if (query.minImportance !== undefined) {
      sql += ' AND importance >= ?';
      params.push(query.minImportance);
    }

    if (query.timeRange) {
      sql += ' AND created_at BETWEEN ? AND ?';
      params.push(query.timeRange.start.getTime(), query.timeRange.end.getTime());
    }

    if (query.tags && query.tags.length > 0) {
      const tagConditions = query.tags.map(() => 'tags LIKE ?').join(' OR ');
      sql += ` AND (${tagConditions})`;
      query.tags.forEach(tag => params.push(`%"${tag}"%`));
    }

    sql += ' ORDER BY importance DESC, last_accessed DESC';

    if (query.maxResults) {
      sql += ' LIMIT ?';
      params.push(query.maxResults);
    }

    const rows = await this.runQuery(sql, params) as any[];
    const memories = rows.map(row => this.rowToMemoryRecord(row));

    // Perform semantic search if text query provided
    let results: MemorySearchResult[] = [];
    
    if (query.text) {
      const queryEmbedding = await this.generateEmbedding(query.text);
      results = memories.map(memory => {
        const score = this.calculateSimilarity(queryEmbedding, memory.embedding || []);
        return {
          record: memory,
          score,
          explanation: `Similarity: ${(score * 100).toFixed(1)}%`,
          relatedRecords: []
        };
      });

      // Filter by similarity threshold
      const threshold = query.similarityThreshold || this.config.vectorSearchThreshold;
      results = results.filter(r => r.score >= threshold);
      
      // Sort by score
      results.sort((a, b) => b.score - a.score);
    } else {
      results = memories.map(memory => ({
        record: memory,
        score: memory.importance,
        explanation: 'Importance-based match',
        relatedRecords: []
      }));
    }

    // Update access tracking
    for (const result of results) {
      await this.updateAccess(result.record.id);
    }

    // Load related records
    for (const result of results) {
      result.relatedRecords = await this.getRelatedMemories(result.record.id);
    }

    // Track retrieval time for performance metrics
    const retrievalTime = Date.now() - startTime;
    this.trackRetrievalTime(retrievalTime);

    return results;
  }

  /**
   * Retrieve specific memory by ID
   */
  async getMemory(id: string): Promise<MemoryRecord | null> {
    // Check cache first
    if (this.cache.has(id)) {
      await this.updateAccess(id);
      return this.cache.get(id)!;
    }

    const rows = await this.runQuery('SELECT * FROM memories WHERE id = ?', [id]) as any[];
    if (rows.length === 0) return null;

    const memory = this.rowToMemoryRecord(rows[0]);
    this.cache.set(id, memory);
    await this.updateAccess(id);

    return memory;
  }

  /**
   * Update memory content and metadata
   */
  async updateMemory(
    id: string,
    updates: Partial<MemoryRecord>
  ): Promise<void> {
    const existing = await this.getMemory(id);
    if (!existing) {
      throw new Error(`Memory with id ${id} not found`);
    }

    const now = Date.now();
    const updatedRecord = { ...existing, ...updates, updatedAt: new Date(now) };

    if (updates.content) {
      updatedRecord.embedding = await this.generateEmbedding(updates.content);
      updatedRecord.metadata.checksum = this.generateChecksum(updates.content);
    }

    await this.runQuery(
      `UPDATE memories SET 
        content = ?, metadata = ?, embedding = ?, updated_at = ?,
        importance = ?, tags = ?
       WHERE id = ?`,
      [
        updatedRecord.content,
        JSON.stringify(updatedRecord.metadata),
        JSON.stringify(updatedRecord.embedding),
        now,
        updatedRecord.importance,
        JSON.stringify(updatedRecord.tags),
        id
      ]
    );

    this.cache.set(id, updatedRecord);
  }

  /**
   * Delete memory (soft delete by archiving)
   */
  async deleteMemory(id: string, permanent: boolean = false): Promise<void> {
    if (permanent) {
      await this.runQuery('DELETE FROM memories WHERE id = ?', [id]);
      await this.runQuery('DELETE FROM memory_relationships WHERE source_id = ? OR target_id = ?', [id, id]);
    } else {
      await this.runQuery('UPDATE memories SET archived = 1 WHERE id = ?', [id]);
    }

    this.cache.delete(id);
  }

  /**
   * Learn from user interaction patterns
   */
  async learnFromInteraction(
    interaction: {
      type: string;
      success: boolean;
      context: Record<string, any>;
      duration: number;
    }
  ): Promise<void> {
    const patternId = this.generateId();
    const pattern = `${interaction.type}_${interaction.success ? 'success' : 'failure'}`;
    
    // Check if pattern already exists
    const existing = await this.runQuery(
      'SELECT * FROM learning_patterns WHERE pattern = ? AND category = ?',
      [pattern, interaction.type]
    ) as any[];

    if (existing.length > 0) {
      // Update existing pattern
      const current = existing[0];
      const newFrequency = current.frequency + 1;
      const newSuccessRate = interaction.success 
        ? (current.success_rate * current.frequency + 1) / newFrequency
        : (current.success_rate * current.frequency) / newFrequency;

      await this.runQuery(
        'UPDATE learning_patterns SET frequency = ?, success_rate = ?, last_reinforced = ? WHERE id = ?',
        [newFrequency, newSuccessRate, Date.now(), current.id]
      );
    } else {
      // Create new pattern
      await this.runQuery(
        'INSERT INTO learning_patterns (id, pattern, category, frequency, success_rate, last_reinforced, context, examples, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          patternId,
          pattern,
          interaction.type,
          1,
          interaction.success ? 1.0 : 0.0,
          Date.now(),
          JSON.stringify(interaction.context),
          JSON.stringify([pattern]),
          0.5
        ]
      );
    }
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats(): Promise<MemoryStats> {
    const totalRows = await this.runQuery('SELECT COUNT(*) as count FROM memories WHERE archived = 0') as any[];
    const totalRecords = totalRows && totalRows.length > 0 ? totalRows[0]?.count || 0 : 0;

    const typeRows = await this.runQuery(`
      SELECT type, COUNT(*) as count 
      FROM memories 
      WHERE archived = 0 
      GROUP BY type
    `) as any[];

    const recordsByType: Record<MemoryType, number> = {} as any;
    if (typeRows && Array.isArray(typeRows)) {
      for (const row of typeRows) {
        if (row && row.type && typeof row.count === 'number') {
          recordsByType[row.type as MemoryType] = row.count;
        }
      }
    }

    const importanceRows = await this.runQuery('SELECT AVG(importance) as avg FROM memories WHERE archived = 0') as any[];
    const avgImportance = importanceRows && importanceRows.length > 0 ? importanceRows[0]?.avg || 0 : 0;

    const mostAccessed = await this.runQuery(`
      SELECT * FROM memories 
      WHERE archived = 0 
      ORDER BY access_count DESC 
      LIMIT 10
    `) as any[];

    const recentlyCreated = await this.runQuery(`
      SELECT * FROM memories 
      WHERE archived = 0 
      ORDER BY created_at DESC 
      LIMIT 10
    `) as any[];

    const health = await this.getMemoryHealth();

    return {
      totalRecords,
      recordsByType,
      storageUsed: await this.calculateStorageUsed(),
      avgImportance,
      mostAccessedRecords: Array.isArray(mostAccessed) ? mostAccessed.map(row => this.rowToMemoryRecord(row)) : [],
      recentlyCreated: Array.isArray(recentlyCreated) ? recentlyCreated.map(row => this.rowToMemoryRecord(row)) : [],
      memoryHealth: health
    };
  }

  /**
   * Optimize memory storage
   */
  async optimizeMemory(): Promise<MemoryOptimization> {
    const startTime = Date.now();
    
    // Remove duplicate memories
    const duplicates = await this.findDuplicateMemories();
    let deduplicationSavings = 0;
    
    for (const duplicate of duplicates) {
      await this.deleteMemory(duplicate.id, true);
      deduplicationSavings++;
    }

    // Compress old memories
    const compressionRatio = await this.compressOldMemories();

    // Update memory cache
    await this.optimizeCache();

    // Rebuild indexes
    await this.runQuery('REINDEX');

    const endTime = Date.now();
    const optimizationTime = endTime - startTime;

    return {
      compressionRatio,
      deduplicationSavings,
      indexOptimization: optimizationTime,
      cacheHitRate: this.calculateCacheHitRate(),
      averageRetrievalTime: this.calculateAverageRetrievalTime()
    };
  }

  /**
   * Export memories to JSON
   */
  async exportMemories(filepath: string): Promise<void> {
    const memories = await this.runQuery('SELECT * FROM memories') as any[];
    const relationships = await this.runQuery('SELECT * FROM memory_relationships') as any[];
    const patterns = await this.runQuery('SELECT * FROM learning_patterns') as any[];

    const exportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      memories: memories.map(row => this.rowToMemoryRecord(row)),
      relationships,
      patterns,
      config: this.config
    };

    await fs.writeJSON(filepath, exportData, { spaces: 2 });
  }

  /**
   * Import memories from JSON
   */
  async importMemories(filepath: string): Promise<void> {
    const data = await fs.readJSON(filepath);
    
    // Import memories
    for (const memory of data.memories) {
      await this.storeMemory(
        memory.type,
        memory.content,
        memory.metadata,
        memory.importance,
        memory.tags
      );
    }

    // Import relationships
    for (const rel of data.relationships) {
      await this.runQuery(
        'INSERT INTO memory_relationships (id, source_id, target_id, relationship_type, strength, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [rel.id, rel.source_id, rel.target_id, rel.relationship_type, rel.strength, rel.metadata, rel.created_at]
      );
    }

    // Import learning patterns
    for (const pattern of data.patterns) {
      await this.runQuery(
        'INSERT INTO learning_patterns (id, pattern, category, frequency, success_rate, last_reinforced, context, examples, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [pattern.id, pattern.pattern, pattern.category, pattern.frequency, pattern.success_rate, pattern.last_reinforced, pattern.context, pattern.examples, pattern.confidence]
      );
    }
  }

  // Private helper methods

  private async runQuery(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        this.db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } else {
        this.db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      }
    });
  }

  private rowToMemoryRecord(row: any): MemoryRecord {
    return {
      id: row.id,
      type: row.type,
      content: row.content,
      metadata: JSON.parse(row.metadata),
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastAccessed: new Date(row.last_accessed),
      accessCount: row.access_count,
      importance: row.importance,
      tags: JSON.parse(row.tags),
      associatedFiles: JSON.parse(row.associated_files),
      sessionId: row.session_id,
      projectId: row.project_id
    };
  }

  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateChecksum(content: string): string {
    return CryptoJS.SHA256(content).toString();
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Simple embedding using character frequencies (production would use proper embeddings)
    if (this.embedding_cache.has(text)) {
      return this.embedding_cache.get(text)!;
    }

    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const embedding = new Array(this.config.vectorDimensions).fill(0);
    
    for (const word of words) {
      const hash = this.simpleHash(word);
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] += Math.sin(hash + i) * 0.1;
      }
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }

    this.embedding_cache.set(text, embedding);
    return embedding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  private calculateSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < a.length; i++) {
      const aVal = a[i];
      const bVal = b[i];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        dotProduct += aVal * bVal;
        magnitudeA += aVal * aVal;
        magnitudeB += bVal * bVal;
      }
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  private async updateAccess(id: string): Promise<void> {
    await this.runQuery(
      'UPDATE memories SET last_accessed = ?, access_count = access_count + 1 WHERE id = ?',
      [Date.now(), id]
    );
  }

  private async getRelatedMemories(id: string, limit: number = 5): Promise<MemoryRecord[]> {
    const relatedIds = await this.runQuery(`
      SELECT target_id FROM memory_relationships 
      WHERE source_id = ? 
      ORDER BY strength DESC 
      LIMIT ?
    `, [id, limit]) as any[];

    const memories: MemoryRecord[] = [];
    for (const row of relatedIds) {
      const memory = await this.getMemory(row.target_id);
      if (memory) memories.push(memory);
    }

    return memories;
  }

  private async storeRelationships(sourceId: string, relationships: any[]): Promise<void> {
    for (const rel of relationships) {
      await this.runQuery(
        'INSERT INTO memory_relationships (id, source_id, target_id, relationship_type, strength, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          this.generateId(),
          sourceId,
          rel.targetId,
          rel.type,
          rel.strength,
          JSON.stringify(rel.metadata || {}),
          Date.now()
        ]
      );
    }
  }

  private async loadInitialCache(): Promise<void> {
    const recent = await this.runQuery(`
      SELECT * FROM memories 
      WHERE archived = 0 
      ORDER BY last_accessed DESC 
      LIMIT 100
    `) as any[];

    for (const row of recent) {
      const memory = this.rowToMemoryRecord(row);
      this.cache.set(memory.id, memory);
    }
  }

  private async updateLearningPatterns(type: MemoryType, content: string, tags: string[]): Promise<void> {
    // Extract patterns from content and tags
    const patterns = this.extractPatterns(content, tags);
    
    for (const pattern of patterns) {
      await this.learnFromInteraction({
        type: type,
        success: true,
        context: { pattern, tags },
        duration: 0
      });
    }
  }

  private extractPatterns(content: string, tags: string[]): string[] {
    const patterns: string[] = [];
    
    // Code patterns
    if (content.includes('function ')) patterns.push('function_definition');
    if (content.includes('class ')) patterns.push('class_definition');
    if (content.includes('import ')) patterns.push('import_statement');
    if (content.includes('export ')) patterns.push('export_statement');
    
    // Error patterns
    if (content.includes('error') || content.includes('Error')) patterns.push('error_handling');
    
    // Tag-based patterns
    patterns.push(...tags.map(tag => `tag_${tag}`));
    
    return patterns;
  }

  private async performHealthCheck(): Promise<void> {
    try {
      // Check database integrity
      const integrityCheck = await this.runQuery('PRAGMA integrity_check') as any[];
      if (integrityCheck && Array.isArray(integrityCheck) && integrityCheck.length > 0) {
        const firstResult = integrityCheck[0];
        if (firstResult && firstResult.integrity_check !== 'ok') {
          console.warn('⚠️  Database integrity issues detected');
        }
      }

      // Check cache consistency
      //console.log(`📊 Memory cache loaded with ${this.cache.size} records`);
      
      // Check storage usage
      if (await fs.pathExists(this.config.databasePath)) {
       // const stats = await fs.stat(this.config.databasePath);
        // const sizeGB = stats.size / (1024 * 1024 * 1024);
        // console.log(`💾 Database size: ${sizeGB.toFixed(2)} GB`);
      }
    } catch (error) {
      console.warn('⚠️  Health check failed:', error);
    }
  }

  private async getMemoryHealth(): Promise<MemoryHealthStatus> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check database size
      if (await fs.pathExists(this.config.databasePath)) {
        const stats = await fs.stat(this.config.databasePath);
        const sizeMB = stats.size / (1024 * 1024);
        
        if (sizeMB > this.config.maxMemorySize) {
          issues.push('Database size exceeds configured limit');
          recommendations.push('Run memory optimization or increase size limit');
        }
      } else {
        issues.push('Database file not found');
        recommendations.push('Initialize the memory system');
      }

      // Check cache performance
      const cacheHitRate = this.calculateCacheHitRate();
      if (cacheHitRate < 0.8) {
        issues.push('Low cache hit rate');
        recommendations.push('Increase cache size or optimize access patterns');
      }
    } catch (error) {
      issues.push('Health check failed');
      recommendations.push('Check database permissions and file system');
    }

    const status = issues.length === 0 ? 'healthy' : 
                   issues.length < 3 ? 'degraded' : 'critical';

    return {
      status,
      issues,
      recommendations,
      lastCheckup: new Date()
    };
  }

  private async findDuplicateMemories(): Promise<MemoryRecord[]> {
    const duplicates = await this.runQuery(`
      SELECT m1.* FROM memories m1
      INNER JOIN memories m2 ON m1.checksum = m2.checksum AND m1.id != m2.id
      WHERE m1.archived = 0
    `) as any[];

    return duplicates.map(row => this.rowToMemoryRecord(row));
  }

  private async compressOldMemories(): Promise<number> {
    // Simple compression by summarizing old memories
    const oldMemories = await this.runQuery(`
      SELECT * FROM memories 
      WHERE created_at < ? AND archived = 0
      ORDER BY created_at ASC
    `, [Date.now() - (30 * 24 * 60 * 60 * 1000)]) as any[]; // 30 days old

    let compressionRatio = 1.0;
    let compressed = 0;

    for (const row of oldMemories) {
      if (row.content.length > 1000) {
        const summary = row.content.substring(0, 500) + '...[compressed]';
        await this.runQuery(
          'UPDATE memories SET content = ? WHERE id = ?',
          [summary, row.id]
        );
        compressed++;
      }
    }

    if (oldMemories.length > 0) {
      compressionRatio = compressed / oldMemories.length;
    }

    return compressionRatio;
  }

  private async optimizeCache(): Promise<void> {
    // Keep only recently accessed memories in cache
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    
    for (const [id, memory] of this.cache.entries()) {
      if (memory.lastAccessed.getTime() < cutoffTime) {
        this.cache.delete(id);
      }
    }
  }

  private calculateCacheHitRate(): number {
    // Simple approximation based on cache size vs total records
    return Math.min(this.cache.size / 100, 1.0);
  }

  private trackRetrievalTime(time: number): void {
    this.retrievalTimes.push(time);
    
    // Keep only the most recent samples to avoid memory bloat
    if (this.retrievalTimes.length > this.maxRetrievalSamples) {
      this.retrievalTimes.shift();
    }
  }

  private calculateAverageRetrievalTime(): number {
    if (this.retrievalTimes.length === 0) {
      return 0;
    }
    
    const sum = this.retrievalTimes.reduce((acc, time) => acc + time, 0);
    return sum / this.retrievalTimes.length;
  }

  private async calculateStorageUsed(): Promise<number> {
    try {
      const stats = await fs.stat(this.config.databasePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Close the memory manager and database connections
   */
  async close(): Promise<void> {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db!.close((err) => {
          if (err) reject(err);
          else {
            this.db = null;
            this.isInitialized = false;
            resolve();
          }
        });
      });
    }
  }

  /**
   * Get current context
   */
  getContext(): MemoryContext {
    return this.context;
  }

  /**
   * Update context
   */
  updateContext(updates: Partial<MemoryContext>): void {
    this.context = { ...this.context, ...updates };
  }
}

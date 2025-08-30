/**
 * Advanced Token Optimization Engine for OpenClaude
 * Addresses Claude Code weakness: 40% token waste through intelligent optimization
 * Implements semantic caching, context compression, and predictive loading
 */

import fs from 'fs-extra';
import path from 'path';
import { EventEmitter } from 'events';
import CryptoJS from 'crypto-js';

export interface TokenUsage {
  input: number;
  output: number;
  cached: number;
  total: number;
  cost: number;
  timestamp: Date;
  model: string;
}

export interface OptimizationMetrics {
  originalTokens: number;
  optimizedTokens: number;
  savedTokens: number;
  compressionRatio: number;
  cacheHitRate: number;
  costSavings: number;
  optimizationTime: number;
}

export interface SemanticCache {
  id: string;
  contentHash: string;
  semanticHash: string;
  content: string;
  compressedContent: string;
  tokens: number;
  frequency: number;
  lastAccessed: Date;
  created: Date;
  tags: string[];
}

export interface ContextSegment {
  id: string;
  type: 'conversation' | 'project' | 'memory' | 'tools';
  priority: number;
  tokens: number;
  content: string;
  compressed: boolean;
  importance: number;
  lastUsed: Date;
}

export interface PredictiveContext {
  patterns: string[];
  likelihood: number;
  suggestedContent: string[];
  preloadTokens: number;
}

export interface CompressionResult {
  original: string;
  compressed: string;
  ratio: number;
  reversible: boolean;
  quality: number;
}

export interface CostAlert {
  type: 'warning' | 'limit' | 'exceeded';
  currentCost: number;
  budgetLimit: number;
  estimatedDaily: number;
  suggestion: string;
  timestamp: Date;
}

export class TokenOptimizer extends EventEmitter {
  private cachePath: string;
  private semanticCache: Map<string, SemanticCache> = new Map();
  private usageHistory: TokenUsage[] = [];
  private optimizationStats: OptimizationMetrics[] = [];
  private compressionPatterns: Map<string, string> = new Map();
  private frequentPatterns: Map<string, number> = new Map();
  
  // Configuration
  private config = {
    maxCacheSize: 10000, // Maximum cached items
    compressionThreshold: 500, // Tokens threshold for compression
    cacheExpiryDays: 7, // Cache expiry in days
    maxUsageHistory: 1000, // Maximum usage records
    semanticSimilarityThreshold: 0.85, // Similarity threshold for cache hits
    costAlertThresholds: {
      daily: 5.0, // $5 daily warning
      monthly: 100.0, // $100 monthly limit
      perRequest: 1.0 // $1 per request warning
    },
    compressionAlgorithms: ['pattern', 'semantic', 'frequency', 'contextual']
  };

  // Token cost per model (per 1M tokens)
  private modelPricing = {
    'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
    'claude-opus-4-20250514': { input: 15.0, output: 75.0 },
    'claude-haiku-3-20240307': { input: 0.25, output: 1.25 }
  };

  constructor(projectPath: string) {
    super();
    this.cachePath = path.join(projectPath, '.openclaude', 'optimization');
    
    // Initialize optimization patterns
    this.initializeCompressionPatterns();
  }

  /**
   * Initialize the token optimizer
   */
  async initialize(): Promise<void> {
    try {
      // Ensure cache directory exists
      await fs.ensureDir(this.cachePath);
      
      // Load existing cache
      await this.loadSemanticCache();
      
      // Load usage history
      await this.loadUsageHistory();
      
      // Load compression patterns
      await this.loadCompressionPatterns();
      
      // Start background optimization
      this.startBackgroundOptimization();
      
      this.emit('initialized');
      // console.log('✅ Token optimizer initialized successfully');
      
    } catch (error) {
      this.emit('error', error);
      throw new Error(`Failed to initialize token optimizer: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Optimize request for minimal token usage
   */
  async optimizeRequest(
    content: string,
    context: Record<string, any> = {},
    model: string = 'claude-sonnet-4-20250514'
  ): Promise<{
    optimizedContent: string;
    originalTokens: number;
    optimizedTokens: number;
    savings: OptimizationMetrics;
    cacheHits: string[];
  }> {
    const startTime = Date.now();
    const originalTokens = this.estimateTokens(content);
    
    // Check semantic cache first
    const cacheResults = await this.checkSemanticCache(content);
    
    let optimizedContent = content;
    const cacheHits: string[] = [];
    
    if (cacheResults.length > 0) {
      // Use cached optimized version
      const firstResult = cacheResults[0];
      if (firstResult) {
        optimizedContent = firstResult.compressedContent;
        cacheHits.push(...cacheResults.map(r => r.id));
      }
      
      // Update cache statistics
      for (const cache of cacheResults) {
        cache.frequency++;
        cache.lastAccessed = new Date();
        this.semanticCache.set(cache.id, cache);
      }
    } else {
      // Perform optimization
      optimizedContent = await this.performOptimization(content, context);
      
      // Cache the result
      await this.cacheOptimizedContent(content, optimizedContent, context);
    }
    
    const optimizedTokens = this.estimateTokens(optimizedContent);
    const optimizationTime = Date.now() - startTime;
    
    const savings: OptimizationMetrics = {
      originalTokens,
      optimizedTokens,
      savedTokens: originalTokens - optimizedTokens,
      compressionRatio: optimizedTokens / originalTokens,
      cacheHitRate: cacheHits.length > 0 ? 1.0 : 0.0,
      costSavings: this.calculateCostSavings(originalTokens, optimizedTokens, model),
      optimizationTime
    };
    
    // Store optimization metrics
    this.optimizationStats.push(savings);
    
    // Emit optimization event
    this.emit('content_optimized', { savings, cacheHits: cacheHits.length });
    
    return {
      optimizedContent,
      originalTokens,
      optimizedTokens,
      savings,
      cacheHits
    };
  }

  /**
   * Perform comprehensive content optimization
   */
  private async performOptimization(content: string, context: Record<string, any>): Promise<string> {
    let optimized = content;
    
    // 1. Pattern-based compression
    optimized = this.applyPatternCompression(optimized);
    
    // 2. Semantic compression
    optimized = this.applySemanticCompression(optimized, context);
    
    // 3. Frequency-based optimization
    optimized = this.applyFrequencyOptimization(optimized);
    
    // 4. Contextual compression
    optimized = this.applyContextualCompression(optimized, context);
    
    // 5. Redundancy removal
    optimized = this.removeRedundancy(optimized);
    
    // 6. Structure optimization
    optimized = this.optimizeStructure(optimized);
    
    return optimized;
  }

  /**
   * Apply pattern-based compression
   */
  private applyPatternCompression(content: string): string {
    let compressed = content;
    
    // Apply common compression patterns
    for (const [pattern, replacement] of this.compressionPatterns.entries()) {
      const regex = new RegExp(pattern, 'gi');
      compressed = compressed.replace(regex, replacement);
    }
    
    return compressed;
  }

  /**
   * Apply semantic compression
   */
  private applySemanticCompression(content: string, _context: Record<string, any>): string {
    // Extract key concepts and compress verbose explanations
    const lines = content.split('\n');
    const compressed: string[] = [];
    
    for (const line of lines) {
      if (line.trim().length === 0) {
        compressed.push(line);
        continue;
      }
      
      // Compress verbose descriptions
      if (line.length > 200) {
        const essential = this.extractEssentialConcepts(line);
        if (essential.length < line.length * 0.7) {
          compressed.push(essential);
          continue;
        }
      }
      
      compressed.push(line);
    }
    
    return compressed.join('\n');
  }

  /**
   * Apply frequency-based optimization
   */
  private applyFrequencyOptimization(content: string): string {
    // Replace frequently used phrases with shorter equivalents
    const words = content.split(/\s+/);
    const optimized: string[] = [];
    
    for (const word of words) {
      const frequency = this.frequentPatterns.get(word.toLowerCase()) || 0;
      
      if (frequency > 10 && word.length > 8) {
        // Use abbreviated form for very frequent long words
        const abbreviated = this.getAbbreviation(word);
        optimized.push(abbreviated);
      } else {
        optimized.push(word);
      }
    }
    
    return optimized.join(' ');
  }

  /**
   * Apply contextual compression
   */
  private applyContextualCompression(content: string, context: Record<string, any>): string {
    let compressed = content;
    
    // Remove context that's already established
    if (context['previousMessages']) {
      // Remove redundant context repetition
      compressed = this.removeRedundantContext(compressed, context['previousMessages']);
    }
    
    if (context['projectContext']) {
      // Remove project details already known
      compressed = this.removeKnownProjectContext(compressed, context['projectContext']);
    }
    
    return compressed;
  }

  /**
   * Remove redundancy from content
   */
  private removeRedundancy(content: string): string {
    const sentences = content.split(/[.!?]+/);
    const unique: string[] = [];
    const seen = new Set<string>();
    
    for (const sentence of sentences) {
      const normalized = sentence.trim().toLowerCase();
      if (normalized && !seen.has(normalized)) {
        unique.push(sentence.trim());
        seen.add(normalized);
      }
    }
    
    return unique.join('. ').replace(/\.\./g, '.');
  }

  /**
   * Optimize content structure
   */
  private optimizeStructure(content: string): string {
    let optimized = content;
    
    // Remove excessive whitespace
    optimized = optimized.replace(/\n\s*\n\s*\n/g, '\n\n');
    optimized = optimized.replace(/[ \t]+/g, ' ');
    
    // Optimize list structures
    optimized = optimized.replace(/^\s*[-*+]\s+/gm, '• ');
    
    // Optimize code block markers
    optimized = optimized.replace(/```(\w+)?\n/g, '```\n');
    
    return optimized.trim();
  }

  /**
   * Check semantic cache for similar content
   */
  private async checkSemanticCache(content: string): Promise<SemanticCache[]> {
    const contentHash = this.generateContentHash(content);
    const semanticHash = this.generateSemanticHash(content);
    
    const matches: SemanticCache[] = [];
    
    for (const cache of this.semanticCache.values()) {
      // Exact match
      if (cache.contentHash === contentHash) {
        matches.push(cache);
        continue;
      }
      
      // Semantic similarity match
      const similarity = this.calculateSemanticSimilarity(semanticHash, cache.semanticHash);
      if (similarity >= this.config.semanticSimilarityThreshold) {
        matches.push(cache);
      }
    }
    
    return matches.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Cache optimized content
   */
  private async cacheOptimizedContent(
    original: string,
    optimized: string,
    context: Record<string, any>
  ): Promise<void> {
    const cache: SemanticCache = {
      id: this.generateId(),
      contentHash: this.generateContentHash(original),
      semanticHash: this.generateSemanticHash(original),
      content: original,
      compressedContent: optimized,
      tokens: this.estimateTokens(optimized),
      frequency: 1,
      lastAccessed: new Date(),
      created: new Date(),
      tags: this.extractTags(original, context)
    };
    
    this.semanticCache.set(cache.id, cache);
    
    // Cleanup old cache entries if needed
    if (this.semanticCache.size > this.config.maxCacheSize) {
      await this.cleanupCache();
    }
  }

  /**
   * Track token usage
   */
  async trackUsage(
    inputTokens: number,
    outputTokens: number,
    model: string,
    cached: number = 0
  ): Promise<TokenUsage> {
    const usage: TokenUsage = {
      input: inputTokens,
      output: outputTokens,
      cached,
      total: inputTokens + outputTokens,
      cost: this.calculateCost(inputTokens, outputTokens, model),
      timestamp: new Date(),
      model
    };
    
    this.usageHistory.push(usage);
    
    // Keep only recent history
    if (this.usageHistory.length > this.config.maxUsageHistory) {
      this.usageHistory = this.usageHistory.slice(-this.config.maxUsageHistory);
    }
    
    // Check for cost alerts
    await this.checkCostAlerts(usage);
    
    // Update frequent patterns
    this.updateFrequentPatterns();
    
    this.emit('usage_tracked', usage);
    
    return usage;
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats(): {
    totalSavings: OptimizationMetrics;
    recentPerformance: OptimizationMetrics[];
    cacheStats: {
      size: number;
      hitRate: number;
      topItems: SemanticCache[];
    };
    costAnalysis: {
      dailyCost: number;
      monthlyCost: number;
      projectedSavings: number;
    };
  } {
    // Calculate total savings
    const totalSavings = this.optimizationStats.reduce(
      (acc, stat) => ({
        originalTokens: acc.originalTokens + stat.originalTokens,
        optimizedTokens: acc.optimizedTokens + stat.optimizedTokens,
        savedTokens: acc.savedTokens + stat.savedTokens,
        compressionRatio: acc.compressionRatio + stat.compressionRatio,
        cacheHitRate: acc.cacheHitRate + stat.cacheHitRate,
        costSavings: acc.costSavings + stat.costSavings,
        optimizationTime: acc.optimizationTime + stat.optimizationTime
      }),
      {
        originalTokens: 0,
        optimizedTokens: 0,
        savedTokens: 0,
        compressionRatio: 0,
        cacheHitRate: 0,
        costSavings: 0,
        optimizationTime: 0
      }
    );
    
    // Average ratios
    if (this.optimizationStats.length > 0) {
      totalSavings.compressionRatio /= this.optimizationStats.length;
      totalSavings.cacheHitRate /= this.optimizationStats.length;
    }
    
    // Recent performance
    const recentPerformance = this.optimizationStats.slice(-10);
    
    // Cache statistics
    const sortedCache = Array.from(this.semanticCache.values())
      .sort((a, b) => b.frequency - a.frequency);
    
    const cacheHits = this.optimizationStats.filter(s => s.cacheHitRate > 0).length;
    const hitRate = this.optimizationStats.length > 0 ? cacheHits / this.optimizationStats.length : 0;
    
    // Cost analysis
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const dailyUsage = this.usageHistory.filter(u => u.timestamp >= dayAgo);
    const monthlyUsage = this.usageHistory.filter(u => u.timestamp >= monthAgo);
    
    const dailyCost = dailyUsage.reduce((sum, u) => sum + u.cost, 0);
    const monthlyCost = monthlyUsage.reduce((sum, u) => sum + u.cost, 0);
    
    return {
      totalSavings,
      recentPerformance,
      cacheStats: {
        size: this.semanticCache.size,
        hitRate,
        topItems: sortedCache.slice(0, 10)
      },
      costAnalysis: {
        dailyCost,
        monthlyCost,
        projectedSavings: totalSavings.costSavings
      }
    };
  }

  /**
   * Generate real-time cost alert
   */
  private async checkCostAlerts(usage: TokenUsage): Promise<void> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Check daily cost
    const dailyUsage = this.usageHistory.filter(u => u.timestamp >= dayAgo);
    const dailyCost = dailyUsage.reduce((sum, u) => sum + u.cost, 0);
    
    if (dailyCost >= this.config.costAlertThresholds.daily) {
      const alert: CostAlert = {
        type: 'warning',
        currentCost: dailyCost,
        budgetLimit: this.config.costAlertThresholds.daily,
        estimatedDaily: dailyCost,
        suggestion: 'Consider enabling more aggressive optimization or review usage patterns',
        timestamp: now
      };
      
      this.emit('cost_alert', alert);
    }
    
    // Check per-request cost
    if (usage.cost >= this.config.costAlertThresholds.perRequest) {
      const alert: CostAlert = {
        type: 'warning',
        currentCost: usage.cost,
        budgetLimit: this.config.costAlertThresholds.perRequest,
        estimatedDaily: dailyCost,
        suggestion: 'This request used high token count. Consider optimizing content length',
        timestamp: now
      };
      
      this.emit('cost_alert', alert);
    }
  }

  /**
   * Predictive context loading
   */
  async predictRequiredContext(
    currentContext: string,
    userMessage: string
  ): Promise<PredictiveContext> {
    // Analyze patterns from previous interactions
    const patterns = this.analyzeInteractionPatterns(currentContext, userMessage);
    
    // Calculate likelihood of different context needs
    const likelihood = this.calculateContextLikelihood(patterns);
    
    // Suggest optimal context to preload
    const suggestedContent = this.generateSuggestedContext(patterns, likelihood);
    
    const preloadTokens = suggestedContent.reduce(
      (sum, content) => sum + this.estimateTokens(content), 0
    );
    
    return {
      patterns,
      likelihood,
      suggestedContent,
      preloadTokens
    };
  }

  /**
   * Estimate token count for content
   */
  private estimateTokens(content: string): number {
    // More accurate token estimation than simple character count
    // Factors in:
    // - Average 4 characters per token
    // - Code tokens are typically longer
    // - Punctuation and special characters
    
    const words = content.split(/\s+/).length;
    const chars = content.length;
    const codeBlocks = (content.match(/```[\s\S]*?```/g) || []).length;
    
    // Base estimation: chars / 4
    let tokens = Math.ceil(chars / 4);
    
    // Adjust for word boundaries
    tokens = Math.max(tokens, Math.ceil(words * 1.3));
    
    // Adjust for code content (typically more tokens)
    if (codeBlocks > 0) {
      tokens *= 1.2;
    }
    
    return Math.round(tokens);
  }

  /**
   * Calculate cost for token usage
   */
  private calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    const pricing = this.modelPricing[model as keyof typeof this.modelPricing];
    if (!pricing) return 0;
    
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    
    return inputCost + outputCost;
  }

  /**
   * Calculate cost savings from optimization
   */
  private calculateCostSavings(originalTokens: number, optimizedTokens: number, model: string): number {
    const savedTokens = originalTokens - optimizedTokens;
    const pricing = this.modelPricing[model as keyof typeof this.modelPricing];
    if (!pricing) return 0;
    
    // Assume average of input/output pricing for savings calculation
    const avgPrice = (pricing.input + pricing.output) / 2;
    return (savedTokens / 1_000_000) * avgPrice;
  }

  /**
   * Helper methods for optimization
   */
  private generateContentHash(content: string): string {
    return CryptoJS.SHA256(content).toString();
  }

  private generateSemanticHash(content: string): string {
    // Simple semantic hash based on key concepts
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .sort();
    
    const concepts = [...new Set(words)].slice(0, 20).join('');
    return CryptoJS.SHA256(concepts).toString();
  }

  private calculateSemanticSimilarity(hash1: string, hash2: string): number {
    // Advanced Jaccard similarity with character n-grams
    const ngrams1 = this.generateNGrams(hash1, 3);
    const ngrams2 = this.generateNGrams(hash2, 3);
    
    const set1 = new Set(ngrams1);
    const set2 = new Set(ngrams2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  private generateNGrams(text: string, n: number): string[] {
    const ngrams: string[] = [];
    for (let i = 0; i <= text.length - n; i++) {
      ngrams.push(text.substring(i, i + n));
    }
    return ngrams;
  }

  private extractEssentialConcepts(text: string): string {
    // Extract key concepts from verbose text
    const sentences = text.split(/[.!?]+/);
    const essential = sentences
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => {
        // Keep first and last parts of long sentences
        if (s.length > 100) {
          const words = s.split(' ');
          const start = words.slice(0, 8).join(' ');
          const end = words.slice(-4).join(' ');
          return `${start}...${end}`;
        }
        return s;
      });
    
    return essential.join('. ');
  }

  private getAbbreviation(word: string): string {
    // Generate meaningful abbreviations
    const vowels = 'aeiouAEIOU';
    const consonants = word.split('').filter(char => !vowels.includes(char));
    
    if (consonants.length >= 3) {
      return consonants.slice(0, 3).join('').toLowerCase();
    }
    
    return word.slice(0, 4).toLowerCase();
  }

  private removeRedundantContext(content: string, previousMessages: any[]): string {
    // Remove content that was already discussed
    let cleaned = content;
    
    for (const prevMsg of previousMessages.slice(-3)) { // Check last 3 messages
      // Ensure prevMsg is a string before processing
      if (!prevMsg || typeof prevMsg !== 'string') {
        continue;
      }
      
      const commonPhrases = this.findCommonPhrases(content, prevMsg);
      for (const phrase of commonPhrases) {
        if (phrase.length > 20) { // Only remove substantial repetitions
          cleaned = cleaned.replace(new RegExp(phrase, 'gi'), '[ref: previous]');
        }
      }
    }
    
    return cleaned;
  }

  private removeKnownProjectContext(content: string, projectContext: Record<string, any>): string {
    let cleaned = content;
    
    // Remove known project details
    if (projectContext['framework']) {
      const framework = projectContext['framework'];
      cleaned = cleaned.replace(
        new RegExp(`using ${framework}|${framework} framework|${framework} project`, 'gi'),
        framework
      );
    }
    
    return cleaned;
  }

  private findCommonPhrases(text1: string, text2: string): string[] {
    const phrases: string[] = [];
    const words1 = text1.toLowerCase().split(/\s+/);
    
    // Find common 3+ word phrases
    for (let i = 0; i <= words1.length - 3; i++) {
      for (let len = 3; len <= Math.min(10, words1.length - i); len++) {
        const phrase = words1.slice(i, i + len).join(' ');
        if (text2.toLowerCase().includes(phrase)) {
          phrases.push(phrase);
        }
      }
    }
    
    return phrases.filter((phrase, index) => phrases.indexOf(phrase) === index);
  }

  private extractTags(content: string, context: Record<string, any>): string[] {
    const tags: string[] = [];
    
    // Extract from content
    if (content.includes('function')) tags.push('function');
    if (content.includes('class')) tags.push('class');
    if (content.includes('error')) tags.push('error');
    if (content.includes('install')) tags.push('install');
    if (content.includes('debug')) tags.push('debug');
    
    // Extract from context
    if (context['type']) tags.push(context['type']);
    if (context['language']) tags.push(context['language']);
    if (context['framework']) tags.push(context['framework']);
    
    return [...new Set(tags)];
  }

  private analyzeInteractionPatterns(_currentContext: string, userMessage: string): string[] {
    const patterns: string[] = [];
    
    // Common interaction patterns
    if (userMessage.includes('error') || userMessage.includes('fix')) {
      patterns.push('debugging');
    }
    if (userMessage.includes('create') || userMessage.includes('build')) {
      patterns.push('creation');
    }
    if (userMessage.includes('explain') || userMessage.includes('how')) {
      patterns.push('explanation');
    }
    if (userMessage.includes('optimize') || userMessage.includes('improve')) {
      patterns.push('optimization');
    }
    
    return patterns;
  }

  private calculateContextLikelihood(patterns: string[]): number {
    // Calculate likelihood based on pattern frequency in history
    let totalLikelihood = 0;
    
    for (const pattern of patterns) {
      const frequency = this.frequentPatterns.get(pattern) || 0;
      totalLikelihood += Math.min(frequency / 100, 0.9); // Max 90% likelihood per pattern
    }
    
    return Math.min(totalLikelihood / patterns.length, 0.95); // Max 95% overall
  }

  private generateSuggestedContext(patterns: string[], likelihood: number): string[] {
    const suggestions: string[] = [];
    
    if (patterns.includes('debugging') && likelihood > 0.7) {
      suggestions.push('Recent error logs and stack traces');
    }
    if (patterns.includes('creation') && likelihood > 0.6) {
      suggestions.push('Project structure and dependencies');
    }
    if (patterns.includes('explanation') && likelihood > 0.5) {
      suggestions.push('Documentation and examples');
    }
    
    return suggestions;
  }

  private updateFrequentPatterns(): void {
    // Analyze token usage patterns from recent history
    const contentFrequency: Map<string, number> = new Map();
    
    // Extract patterns from cached content
    for (const cache of this.semanticCache.values()) {
      // Analyze word frequency in successful optimizations
      const words = cache.content.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 4);
      
      for (const word of words) {
        contentFrequency.set(word, (contentFrequency.get(word) || 0) + cache.frequency);
      }
    }
    
    // Update frequent patterns based on usage frequency and compression success
    for (const [word, frequency] of contentFrequency.entries()) {
      if (frequency > 5) { // Only track frequently used words
        this.frequentPatterns.set(word, frequency);
      }
    }
    
    // Prune infrequent patterns to keep memory usage low
    for (const [pattern, frequency] of this.frequentPatterns.entries()) {
      if (frequency < 3) {
        this.frequentPatterns.delete(pattern);
      }
    }
  }

  /**
   * Background processes and cleanup
   */
  private startBackgroundOptimization(): void {
    // Cleanup cache every hour
    setInterval(async () => {
      await this.cleanupCache();
    }, 60 * 60 * 1000);
    
    // Update compression patterns every 6 hours
    setInterval(() => {
      this.updateCompressionPatterns();
    }, 6 * 60 * 60 * 1000);
    
    // Save statistics daily
    setInterval(async () => {
      await this.saveOptimizationStats();
    }, 24 * 60 * 60 * 1000);
  }

  private async cleanupCache(): Promise<void> {
    const now = new Date();
    const expiryThreshold = new Date(now.getTime() - this.config.cacheExpiryDays * 24 * 60 * 60 * 1000);
    
    let removedCount = 0;
    
    for (const [id, cache] of this.semanticCache.entries()) {
      if (cache.lastAccessed < expiryThreshold && cache.frequency < 3) {
        this.semanticCache.delete(id);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      this.emit('cache_cleaned', { removed: removedCount });
    }
  }

  private initializeCompressionPatterns(): void {
    // Common compression patterns
    this.compressionPatterns.set(
      'I need you to help me with',
      'Help with'
    );
    this.compressionPatterns.set(
      'Can you please help me',
      'Help me'
    );
    this.compressionPatterns.set(
      'I would like to',
      'I\'ll'
    );
    this.compressionPatterns.set(
      'in order to',
      'to'
    );
    this.compressionPatterns.set(
      'as a result of',
      'due to'
    );
    this.compressionPatterns.set(
      'make sure that',
      'ensure'
    );
    this.compressionPatterns.set(
      'it is important to note that',
      'note:'
    );
    this.compressionPatterns.set(
      'please keep in mind that',
      'remember:'
    );
  }

  private async loadSemanticCache(): Promise<void> {
    try {
      const cachePath = path.join(this.cachePath, 'semantic-cache.json');
      if (await fs.pathExists(cachePath)) {
        const cacheData = await fs.readJSON(cachePath);
        for (const [id, cache] of Object.entries(cacheData)) {
          this.semanticCache.set(id, {
            ...(cache as SemanticCache),
            lastAccessed: new Date((cache as SemanticCache).lastAccessed),
            created: new Date((cache as SemanticCache).created)
          });
        }
      }
    } catch (error) {
      console.warn('Failed to load semantic cache:', error);
    }
  }

  private async loadUsageHistory(): Promise<void> {
    try {
      const historyPath = path.join(this.cachePath, 'usage-history.json');
      if (await fs.pathExists(historyPath)) {
        const historyData = await fs.readJSON(historyPath);
        this.usageHistory = historyData.map((usage: any) => ({
          ...usage,
          timestamp: new Date(usage.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to load usage history:', error);
    }
  }

  private async loadCompressionPatterns(): Promise<void> {
    try {
      const patternsPath = path.join(this.cachePath, 'compression-patterns.json');
      if (await fs.pathExists(patternsPath)) {
        const patternsData = await fs.readJSON(patternsPath);
        for (const [pattern, replacement] of Object.entries(patternsData)) {
          this.compressionPatterns.set(pattern, replacement as string);
        }
      }
    } catch (error) {
      console.warn('Failed to load compression patterns:', error);
    }
  }

  private generateId(): string {
    return `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateCompressionPatterns(): void {
    // Analyze recent optimizations to identify new effective patterns
    const patternCandidates: Map<string, { frequency: number; avgSavings: number }> = new Map();
    
    // Extract successful compression patterns from cache
    for (const cache of this.semanticCache.values()) {
      if (cache.frequency > 2) { // Only patterns used multiple times
        const originalLines = cache.content.split('\n');
        const compressedLines = cache.compressedContent.split('\n');
        
        // Find lines that were significantly compressed
        for (let i = 0; i < Math.min(originalLines.length, compressedLines.length); i++) {
          const originalLine = originalLines[i];
          const compressedLine = compressedLines[i];
          if (!originalLine || !compressedLine) continue;
          
          const original = originalLine.trim();
          const compressed = compressedLine.trim();
          
          if (original.length > compressed.length + 10) { // Significant compression
            // Extract pattern and replacement
            const words = original.split(' ');
            if (words.length >= 3) {
              const pattern = words.slice(0, 3).join(' ');
              const compressedWords = compressed.split(' ');
              const replacement = compressedWords.length >= 2 ? compressedWords.slice(0, 2).join(' ') : compressed;
              
              if (pattern.length > 10 && replacement.length > 0) {
                const existing = patternCandidates.get(pattern) || { frequency: 0, avgSavings: 0 };
                const savings = (original.length - compressed.length) / original.length;
                
                patternCandidates.set(pattern, {
                  frequency: existing.frequency + 1,
                  avgSavings: (existing.avgSavings + savings) / 2
                });
              }
            }
          }
        }
      }
    }
    
    // Add high-value patterns to compression map
    for (const [pattern, stats] of patternCandidates.entries()) {
      if (stats.frequency >= 3 && stats.avgSavings > 0.2) { // Used 3+ times with 20%+ savings
        const compressedVersion = this.generateCompressedVersion(pattern);
        if (compressedVersion && compressedVersion !== pattern) {
          this.compressionPatterns.set(pattern, compressedVersion);
        }
      }
    }
    
    // Save updated patterns
    this.saveCompressionPatterns().catch(error => {
      console.warn('Failed to save compression patterns:', error);
    });
  }

  private generateCompressedVersion(pattern: string): string {
    // Generate compressed version of common patterns
    const words = pattern.split(' ');
    
    // Remove filler words
    const fillers = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'];
    const essential = words.filter(word => !fillers.includes(word.toLowerCase()));
    
    if (essential.length < words.length) {
      return essential.join(' ');
    }
    
    // Use abbreviations for long words
    const abbreviated = words.map(word => {
      if (word.length > 8) {
        return this.getAbbreviation(word);
      }
      return word;
    });
    
    return abbreviated.join(' ');
  }

  private async saveCompressionPatterns(): Promise<void> {
    try {
      const patternsPath = path.join(this.cachePath, 'compression-patterns.json');
      const patternsData = Object.fromEntries(this.compressionPatterns.entries());
      await fs.writeJSON(patternsPath, patternsData, { spaces: 2 });
    } catch (error) {
      console.warn('Failed to save compression patterns:', error);
    }
  }

  private async saveOptimizationStats(): Promise<void> {
    try {
      const statsPath = path.join(this.cachePath, 'optimization-stats.json');
      const recentStats = this.optimizationStats.slice(-1000); // Keep last 1000 records
      await fs.writeJSON(statsPath, recentStats, { spaces: 2 });

      // Also save semantic cache
      const cachePath = path.join(this.cachePath, 'semantic-cache.json');
      const cacheData = Object.fromEntries(this.semanticCache.entries());
      await fs.writeJSON(cachePath, cacheData, { spaces: 2 });

      // Save usage history
      const historyPath = path.join(this.cachePath, 'usage-history.json');
      const recentHistory = this.usageHistory.slice(-1000); // Keep last 1000 records
      await fs.writeJSON(historyPath, recentHistory, { spaces: 2 });

    } catch (error) {
      console.warn('Failed to save optimization stats:', error);
    }
  }

  /**
   * Export optimization data
   */
  async exportOptimizationData(filepath: string): Promise<void> {
    const exportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      semanticCache: Object.fromEntries(this.semanticCache.entries()),
      usageHistory: this.usageHistory,
      optimizationStats: this.optimizationStats,
      compressionPatterns: Object.fromEntries(this.compressionPatterns.entries()),
      frequentPatterns: Object.fromEntries(this.frequentPatterns.entries()),
      config: this.config
    };

    await fs.writeJSON(filepath, exportData, { spaces: 2 });
  }

  /**
   * Import optimization data
   */
  async importOptimizationData(filepath: string): Promise<void> {
    const data = await fs.readJSON(filepath);
    
    // Import semantic cache
    this.semanticCache.clear();
    for (const [id, cache] of Object.entries(data.semanticCache)) {
      this.semanticCache.set(id, {
        ...(cache as SemanticCache),
        lastAccessed: new Date((cache as SemanticCache).lastAccessed),
        created: new Date((cache as SemanticCache).created)
      });
    }
    
    // Import usage history
    this.usageHistory = data.usageHistory.map((usage: any) => ({
      ...usage,
      timestamp: new Date(usage.timestamp)
    }));
    
    // Import optimization stats
    this.optimizationStats = data.optimizationStats || [];
    
    // Import patterns
    this.compressionPatterns.clear();
    for (const [pattern, replacement] of Object.entries(data.compressionPatterns || {})) {
      this.compressionPatterns.set(pattern, replacement as string);
    }
    
    this.frequentPatterns.clear();
    for (const [pattern, frequency] of Object.entries(data.frequentPatterns || {})) {
      this.frequentPatterns.set(pattern, frequency as number);
    }
  }

  /**
   * Clear all optimization data
   */
  async clearOptimizationData(): Promise<void> {
    this.semanticCache.clear();
    this.usageHistory = [];
    this.optimizationStats = [];
    this.frequentPatterns.clear();
    
    // Clear cache files
    try {
      const cacheFiles = [
        'semantic-cache.json',
        'usage-history.json',
        'optimization-stats.json',
        'compression-patterns.json'
      ];
      
      for (const file of cacheFiles) {
        const filePath = path.join(this.cachePath, file);
        if (await fs.pathExists(filePath)) {
          await fs.remove(filePath);
        }
      }
      
      this.emit('data_cleared');
    } catch (error) {
      console.warn('Failed to clear optimization data:', error);
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    averageOptimizationTime: number;
    averageCompressionRatio: number;
    totalCostSavings: number;
    cacheEfficiency: number;
    tokensSavedTotal: number;
  } {
    if (this.optimizationStats.length === 0) {
      return {
        averageOptimizationTime: 0,
        averageCompressionRatio: 1.0,
        totalCostSavings: 0,
        cacheEfficiency: 0,
        tokensSavedTotal: 0
      };
    }

    const totalTime = this.optimizationStats.reduce((sum, s) => sum + s.optimizationTime, 0);
    const totalRatio = this.optimizationStats.reduce((sum, s) => sum + s.compressionRatio, 0);
    const totalSavings = this.optimizationStats.reduce((sum, s) => sum + s.costSavings, 0);
    const totalCacheHits = this.optimizationStats.filter(s => s.cacheHitRate > 0).length;
    const totalTokensSaved = this.optimizationStats.reduce((sum, s) => sum + s.savedTokens, 0);

    return {
      averageOptimizationTime: totalTime / this.optimizationStats.length,
      averageCompressionRatio: totalRatio / this.optimizationStats.length,
      totalCostSavings: totalSavings,
      cacheEfficiency: totalCacheHits / this.optimizationStats.length,
      tokensSavedTotal: totalTokensSaved
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Save final optimization data
    await this.saveOptimizationStats();
    
    this.emit('cleanup_complete');
  }
}

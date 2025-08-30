/**
 * Memory Integration Layer for OpenClaude
 * Integrates memory system with agents and provides high-level interface
 */

import { MemoryManager } from './MemoryManager.js';
import { MemoryConfig, MemoryType, MemoryContext, MemoryQuery } from './types.js';
import { AgentContext } from '../types/agent.js';
import * as path from 'path';

export class MemoryIntegration {
  private memoryManager: MemoryManager;
  private isInitialized: boolean = false;

  constructor(projectPath: string, sessionId: string) {
    const config: MemoryConfig = {
      databasePath: path.join(projectPath, '.openclaude', 'memory', 'database.sqlite'),
      vectorDimensions: 384, // Standard embedding size
      maxMemorySize: 1024, // 1GB limit
      compressionEnabled: true,
      vectorSearchThreshold: 0.3,
      retentionPolicy: {
        shortTermDays: 7,
        longTermDays: 90,
        archiveAfterDays: 365,
        neverDeleteImportant: true
      }
    };

    const context: MemoryContext = {
      currentProject: projectPath,
      currentSession: sessionId,
      workingDirectory: projectPath,
      activeFiles: [],
      userFocus: [],
      temporaryContext: new Map()
    };

    this.memoryManager = new MemoryManager(config, context);
  }

  /**
   * Initialize memory system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.memoryManager.initialize();
    this.isInitialized = true;
  }

  /**
   * Store conversation memory
   */
  async storeConversation(
    userMessage: string,
    assistantResponse: string,
    context: Record<string, any> = {}
  ): Promise<void> {
    if (!this.isInitialized) await this.initialize();

    const conversationContent = `User: ${userMessage}\nAssistant: ${assistantResponse}`;
    
    await this.memoryManager.storeMemory(
      MemoryType.CONVERSATION,
      conversationContent,
      {
        source: 'conversation',
        confidence: 0.9,
        relevance: 0.8,
        context: {
          timestamp: new Date().toISOString(),
          ...context
        }
      },
      0.7, // High importance for conversations
      ['conversation', 'dialogue']
    );
  }

  /**
   * Store code pattern memory
   */
  async storeCodePattern(
    pattern: string,
    description: string,
    filePath?: string,
    language?: string
  ): Promise<void> {
    if (!this.isInitialized) await this.initialize();

    const content = `Pattern: ${pattern}\nDescription: ${description}`;
    const tags = ['code', 'pattern'];
    
    if (language) tags.push(language);
    if (filePath) tags.push('file');

    await this.memoryManager.storeMemory(
      MemoryType.CODE_PATTERN,
      content,
      {
        source: 'code_analysis',
        confidence: 0.8,
        relevance: 0.9,
        context: {
          filePath,
          language,
          timestamp: new Date().toISOString()
        }
      },
      0.8,
      tags
    );
  }

  /**
   * Store user preference
   */
  async storeUserPreference(
    category: string,
    preference: string,
    value: any
  ): Promise<void> {
    if (!this.isInitialized) await this.initialize();

    const content = `${category}: ${preference} = ${JSON.stringify(value)}`;

    await this.memoryManager.storeMemory(
      MemoryType.USER_PREFERENCE,
      content,
      {
        source: 'user_interaction',
        confidence: 1.0,
        relevance: 0.9,
        context: {
          category,
          preference,
          value,
          timestamp: new Date().toISOString()
        }
      },
      0.9, // Very important for user preferences
      ['preference', category]
    );
  }

  /**
   * Store error resolution
   */
  async storeErrorResolution(
    error: string,
    solution: string,
    context: Record<string, any> = {}
  ): Promise<void> {
    if (!this.isInitialized) await this.initialize();

    const content = `Error: ${error}\nSolution: ${solution}`;

    await this.memoryManager.storeMemory(
      MemoryType.ERROR_RESOLUTION,
      content,
      {
        source: 'error_handling',
        confidence: 0.9,
        relevance: 1.0,
        context: {
          ...context,
          timestamp: new Date().toISOString()
        }
      },
      0.95, // Very high importance for error solutions
      ['error', 'solution', 'troubleshooting']
    );
  }

  /**
   * Search memories for relevant context
   */
  async searchRelevantMemories(
    query: string,
    maxResults: number = 10,
    types?: MemoryType[]
  ): Promise<any[]> {
    if (!this.isInitialized) await this.initialize();

    const searchQuery: MemoryQuery = {
      text: query,
      maxResults,
      similarityThreshold: 0.3
    };

    if (types && types.length > 0) {
      // For multiple types, we'll search each type separately and combine results
      const allResults = [];
      for (const type of types) {
        const typeResults = await this.memoryManager.searchMemories({
          ...searchQuery,
          type,
          maxResults: Math.ceil(maxResults / types.length)
        });
        allResults.push(...typeResults);
      }

      // Sort by relevance and limit results
      return allResults
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults)
        .map(result => ({
          content: result.record.content,
          type: result.record.type,
          score: result.score,
          metadata: result.record.metadata,
          tags: result.record.tags
        }));
    }

    const results = await this.memoryManager.searchMemories(searchQuery);
    return results.map(result => ({
      content: result.record.content,
      type: result.record.type,
      score: result.score,
      metadata: result.record.metadata,
      tags: result.record.tags
    }));
  }

  /**
   * Get contextual memories for agent processing
   */
  async getContextualMemories(
    currentMessage: string,
    agentContext: AgentContext
  ): Promise<string> {
    if (!this.isInitialized) await this.initialize();

    // Update memory context
    this.memoryManager.updateContext({
      activeFiles: agentContext.memory.projectKnowledge.structure.files.map(f => f.path),
      userFocus: [currentMessage],
      temporaryContext: new Map([
        ['currentTask', currentMessage],
        ['workingDirectory', agentContext.workingDirectory]
      ])
    });

    // Search for relevant memories
    const memories = await this.searchRelevantMemories(currentMessage, 5, [
      MemoryType.CONVERSATION,
      MemoryType.CODE_PATTERN,
      MemoryType.ERROR_RESOLUTION,
      MemoryType.USER_PREFERENCE
    ]);

    if (memories.length === 0) {
      return '';
    }

    // Format memories for agent context
    let contextString = '\n## Relevant Context from Memory:\n';
    
    for (const memory of memories) {
      contextString += `\n### ${memory.type.replace('_', ' ').toUpperCase()} (Relevance: ${(memory.score * 100).toFixed(0)}%)\n`;
      contextString += `${memory.content}\n`;
      
      if (memory.tags.length > 0) {
        contextString += `*Tags: ${memory.tags.join(', ')}*\n`;
      }
    }

    return contextString;
  }

  /**
   * Learn from interaction outcome
   */
  async learnFromInteraction(
    interaction: {
      userMessage: string;
      response: string;
      success: boolean;
      toolsUsed: string[];
      duration: number;
      context: Record<string, any>;
    }
  ): Promise<void> {
    if (!this.isInitialized) await this.initialize();

    // Store the interaction
    await this.storeConversation(
      interaction.userMessage,
      interaction.response,
      {
        success: interaction.success,
        toolsUsed: interaction.toolsUsed,
        duration: interaction.duration,
        ...interaction.context
      }
    );

    // Learn patterns
    await this.memoryManager.learnFromInteraction({
      type: 'user_interaction',
      success: interaction.success,
      context: interaction.context,
      duration: interaction.duration
    });

    // Store tool usage patterns
    for (const tool of interaction.toolsUsed) {
      await this.memoryManager.learnFromInteraction({
        type: `tool_${tool}`,
        success: interaction.success,
        context: { tool, ...interaction.context },
        duration: interaction.duration
      });
    }
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats(): Promise<any> {
    if (!this.isInitialized) await this.initialize();
    return await this.memoryManager.getMemoryStats();
  }

  /**
   * Optimize memory storage
   */
  async optimizeMemory(): Promise<any> {
    if (!this.isInitialized) await this.initialize();
    return await this.memoryManager.optimizeMemory();
  }

  /**
   * Export memories
   */
  async exportMemories(filepath: string): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    await this.memoryManager.exportMemories(filepath);
  }

  /**
   * Import memories
   */
  async importMemories(filepath: string): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    await this.memoryManager.importMemories(filepath);
  }

  /**
   * Close memory system
   */
  async close(): Promise<void> {
    if (this.isInitialized) {
      await this.memoryManager.close();
      this.isInitialized = false;
    }
  }
}

/**
 * Advanced Context Manager for OpenClaude
 * Implements context persistence, versioning, and intelligent recovery
 * Addresses Claude Code weaknesses: context leak, repeated questions, state confusion
 */

import fs from 'fs-extra';
import path from 'path';
import { EventEmitter } from 'events';
import { MemoryManager } from '../../memory/MemoryManager.js';

export interface ContextState {
  id: string;
  version: number;
  timestamp: Date;
  sessionId: string;
  projectId: string;
  
  // Core Context Data
  conversation: {
    messages: ConversationMessage[];
    activeThread: string;
    threadHistory: string[];
  };
  
  // Project Context
  project: {
    structure: ProjectStructure;
    dependencies: DependencyMap;
    activeFiles: string[];
    modifiedFiles: string[];
    recentChanges: FileChange[];
  };
  
  // User Context
  user: {
    currentTask: string;
    intentions: string[];
    preferences: UserPreferences;
    workingDirectory: string;
  };
  
  // AI Context
  ai: {
    lastModel: string;
    confidence: number;
    reasoning: string[];
    toolsUsed: string[];
    errors: ErrorContext[];
  };
  
  // Memory Context
  memory: {
    relevantMemories: string[];
    patterns: string[];
    learningState: Record<string, any>;
  };
  
  // Health Metrics
  health: {
    quality: number;
    coherence: number;
    completeness: number;
    lastValidation: Date;
    issues: ContextIssue[];
  };
}

export interface ContextVersion {
  id: string;
  parentId?: string;
  timestamp: Date;
  description: string;
  state: ContextState;
  metadata: {
    trigger: string;
    changes: string[];
    size: number;
  };
}

export interface ContextIssue {
  type: 'warning' | 'error' | 'critical';
  category: 'coherence' | 'completeness' | 'memory' | 'performance';
  message: string;
  suggestion: string;
  timestamp: Date;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokens: number;
  tools?: any[];
  metadata: Record<string, any>;
}

export interface ProjectStructure {
  rootPath: string;
  files: FileNode[];
  dependencies: string[];
  framework: string;
  language: string;
}

export interface FileNode {
  path: string;
  type: 'file' | 'directory';
  size: number;
  modified: Date;
  hash: string;
  children?: FileNode[];
}

export interface DependencyMap {
  [key: string]: {
    version: string;
    type: 'dev' | 'prod' | 'peer';
    dependencies: string[];
  };
}

export interface FileChange {
  path: string;
  type: 'created' | 'modified' | 'deleted';
  timestamp: Date;
  size: number;
  changes: number;
}

export interface UserPreferences {
  codingStyle: Record<string, any>;
  frameworks: string[];
  languages: string[];
  patterns: string[];
  conventions: Record<string, any>;
}

export interface ErrorContext {
  message: string;
  type: string;
  timestamp: Date;
  resolved: boolean;
  solution?: string;
}

export class ContextManager extends EventEmitter {
  private projectPath: string;
  private contextPath: string;
  private currentState: ContextState | null = null;
  private versions: Map<string, ContextVersion> = new Map();
  private memoryManager: MemoryManager | null = null;
  private autosaveInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  
  // Configuration
  private config = {
    maxVersions: 50,
    autosaveInterval: 30000, // 30 seconds
    healthCheckInterval: 60000, // 1 minute
    maxContextSize: 100000, // 100k tokens
    compressionThreshold: 0.8,
    qualityThreshold: 0.7,
  };

  constructor(projectPath: string, _apiKey: string) {
    super();
    this.projectPath = projectPath;
    this.contextPath = path.join(projectPath, '.openclaude', 'context');
    
    // Start background processes
    this.startAutosave();
    this.startHealthMonitoring();
  }

  /**
   * Initialize the context manager
   */
  async initialize(sessionId: string): Promise<void> {
    try {
      // Ensure context directory exists
      await fs.ensureDir(this.contextPath);
      
      // Try to restore previous session
      const restored = await this.tryRestoreSession(sessionId);
      
      if (!restored) {
        // Create new context state
        await this.createInitialState(sessionId);
      }
      
      // Validate and repair if needed
      await this.validateAndRepair();
      
      this.emit('initialized', { sessionId, restored });
      //console.log(`✅ Context manager initialized ${restored ? '(restored session)' : '(new session)'}`);
      
    } catch (error) {
      this.emit('error', error);
      throw new Error(`Failed to initialize context manager: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Try to restore previous session
   */
  private async tryRestoreSession(sessionId: string): Promise<boolean> {
    try {
      const sessionPath = path.join(this.contextPath, `${sessionId}.json`);
      
      if (await fs.pathExists(sessionPath)) {
        const data = await fs.readJSON(sessionPath);
        this.currentState = data.state;
        
        // Load versions
        if (data.versions) {
          for (const [id, version] of Object.entries(data.versions)) {
            this.versions.set(id, version as ContextVersion);
          }
        }
        
        // Update session timestamp  
        if (this.currentState) {
          this.currentState.timestamp = new Date();
          await this.saveContext('session_restored');
        }
        
        this.emit('session_restored', { sessionId });
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn(`Warning: Failed to restore session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Create initial context state
   */
  private async createInitialState(sessionId: string): Promise<void> {
    const projectStructure = await this.analyzeProjectStructure();
    
    this.currentState = {
      id: this.generateId(),
      version: 1,
      timestamp: new Date(),
      sessionId,
      projectId: path.basename(this.projectPath),
      
      conversation: {
        messages: [],
        activeThread: 'main',
        threadHistory: ['main']
      },
      
      project: {
        structure: projectStructure,
        dependencies: await this.analyzeDependencies(),
        activeFiles: [],
        modifiedFiles: [],
        recentChanges: []
      },
      
      user: {
        currentTask: '',
        intentions: [],
        preferences: {
          codingStyle: {},
          frameworks: [],
          languages: [],
          patterns: [],
          conventions: {}
        },
        workingDirectory: this.projectPath
      },
      
      ai: {
        lastModel: '',
        confidence: 1.0,
        reasoning: [],
        toolsUsed: [],
        errors: []
      },
      
      memory: {
        relevantMemories: [],
        patterns: [],
        learningState: {}
      },
      
      health: {
        quality: 1.0,
        coherence: 1.0,
        completeness: 1.0,
        lastValidation: new Date(),
        issues: []
      }
    };

    await this.saveContext('initial_state');
  }

  /**
   * Update conversation context
   */
  async updateConversation(
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    if (!this.currentState) {
      throw new Error('Context not initialized');
    }

    // Simple token estimation for context tracking
    const tokens = Math.ceil(content.length / 4); // Rough estimate: 4 chars per token
    
    const message: ConversationMessage = {
      id: this.generateId(),
      role,
      content,
      timestamp: new Date(),
      tokens,
      metadata
    };

    this.currentState.conversation.messages.push(message);
    this.currentState.timestamp = new Date();
    
    // Trigger context pruning if needed
    await this.intelligentPruning();
    
    // Update health metrics
    await this.updateHealthMetrics();
    
    this.emit('conversation_updated', { message, state: this.currentState });
  }

  /**
   * Update project context
   */
  async updateProject(
    activeFiles: string[] = [],
    modifiedFiles: string[] = [],
    changes: FileChange[] = []
  ): Promise<void> {
    if (!this.currentState) return;

    this.currentState.project.activeFiles = activeFiles;
    this.currentState.project.modifiedFiles = modifiedFiles;
    this.currentState.project.recentChanges.push(...changes);
    
    // Keep only recent changes (last 100)
    if (this.currentState.project.recentChanges.length > 100) {
      this.currentState.project.recentChanges = this.currentState.project.recentChanges.slice(-100);
    }
    
    this.currentState.timestamp = new Date();
    
    this.emit('project_updated', { activeFiles, modifiedFiles, changes });
  }

  /**
   * Update user context
   */
  async updateUser(
    currentTask: string,
    intentions: string[] = [],
    preferences: Partial<UserPreferences> = {}
  ): Promise<void> {
    if (!this.currentState) return;

    this.currentState.user.currentTask = currentTask;
    this.currentState.user.intentions = intentions;
    this.currentState.user.preferences = {
      ...this.currentState.user.preferences,
      ...preferences
    };
    
    this.currentState.timestamp = new Date();
    
    this.emit('user_updated', { currentTask, intentions, preferences });
  }

  /**
   * Update AI context
   */
  async updateAI(
    model: string,
    confidence: number,
    reasoning: string[] = [],
    toolsUsed: string[] = [],
    errors: ErrorContext[] = []
  ): Promise<void> {
    if (!this.currentState) return;

    this.currentState.ai.lastModel = model;
    this.currentState.ai.confidence = confidence;
    this.currentState.ai.reasoning.push(...reasoning);
    this.currentState.ai.toolsUsed.push(...toolsUsed);
    this.currentState.ai.errors.push(...errors);
    
    // Keep only recent data
    if (this.currentState.ai.reasoning.length > 50) {
      this.currentState.ai.reasoning = this.currentState.ai.reasoning.slice(-50);
    }
    if (this.currentState.ai.toolsUsed.length > 100) {
      this.currentState.ai.toolsUsed = this.currentState.ai.toolsUsed.slice(-100);
    }
    if (this.currentState.ai.errors.length > 20) {
      this.currentState.ai.errors = this.currentState.ai.errors.slice(-20);
    }
    
    this.currentState.timestamp = new Date();
    
    this.emit('ai_updated', { model, confidence, reasoning, toolsUsed, errors });
  }

  /**
   * Create context version checkpoint
   */
  async createCheckpoint(description: string, trigger: string = 'manual'): Promise<string> {
    if (!this.currentState) {
      throw new Error('Context not initialized');
    }

    const version: ContextVersion = {
      id: this.generateId(),
      parentId: this.currentState.id,
      timestamp: new Date(),
      description,
      state: JSON.parse(JSON.stringify(this.currentState)), // Deep clone
      metadata: {
        trigger,
        changes: this.getRecentChanges(),
        size: JSON.stringify(this.currentState).length
      }
    };

    this.versions.set(version.id, version);
    
    // Update current state version
    this.currentState.version++;
    this.currentState.id = this.generateId();
    
    // Cleanup old versions
    await this.cleanupOldVersions();
    
    // Save to disk
    await this.saveContext(`checkpoint_${trigger}`);
    
    this.emit('checkpoint_created', { version, state: this.currentState });
    
    return version.id;
  }

  /**
   * Revert to previous version
   */
  async revertToVersion(versionId: string): Promise<void> {
    const version = this.versions.get(versionId);
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }

    // Create checkpoint of current state before reverting
    await this.createCheckpoint(`Before reverting to ${versionId}`, 'revert_backup');
    
    // Restore the version
    this.currentState = JSON.parse(JSON.stringify(version.state)); // Deep clone
    if (this.currentState) {
      this.currentState.timestamp = new Date();
    }
    
    await this.saveContext('reverted');
    
    this.emit('reverted', { versionId, state: this.currentState });
    
    console.log(`✅ Reverted to version: ${version.description}`);
  }

  /**
   * Intelligent context pruning to prevent bloat
   */
  private async intelligentPruning(): Promise<void> {
    if (!this.currentState) return;

    const totalTokens = this.currentState.conversation.messages.reduce(
      (sum, msg) => sum + msg.tokens, 0
    );

    if (totalTokens > this.config.maxContextSize) {
      const importantMessages = this.identifyImportantMessages();
      const prunedMessages = this.pruneMessages(importantMessages);
      
      // Create summary of pruned content
      const prunedContent = this.currentState.conversation.messages
        .filter(msg => !prunedMessages.includes(msg.id))
        .map(msg => `${msg.role}: ${msg.content.substring(0, 100)}...`)
        .join('\n');
      
      if (prunedContent) {
        // Store summary in memory
        if (this.memoryManager) {
          await this.memoryManager.storeMemory(
            'conversation' as any,
            `Conversation summary (pruned):\n${prunedContent}`,
            { source: 'context_pruning', confidence: 0.8 },
            0.6,
            ['pruned', 'summary']
          );
        }
      }
      
      this.currentState.conversation.messages = this.currentState.conversation.messages
        .filter(msg => prunedMessages.includes(msg.id));
      
      this.emit('context_pruned', { 
        removedMessages: this.currentState.conversation.messages.length,
        totalTokens: this.currentState.conversation.messages.reduce((sum, msg) => sum + msg.tokens, 0)
      });
    }
  }

  /**
   * Identify important messages that should not be pruned
   */
  private identifyImportantMessages(): string[] {
    if (!this.currentState) return [];

    const important: string[] = [];
    const messages = this.currentState.conversation.messages;
    
    // Always keep recent messages
    const recentCount = Math.min(20, messages.length);
    important.push(...messages.slice(-recentCount).map(m => m.id));
    
    // Keep messages with high metadata importance
    for (const msg of messages) {
      if (msg.metadata['important'] === true) {
        important.push(msg.id);
      }
      
      // Keep messages with tool usage
      if (msg.tools && msg.tools.length > 0) {
        important.push(msg.id);
      }
      
      // Keep error-related messages
      if (msg.content.toLowerCase().includes('error') || 
          msg.content.toLowerCase().includes('failed')) {
        important.push(msg.id);
      }
    }
    
    return [...new Set(important)]; // Remove duplicates
  }

  /**
   * Prune messages intelligently
   */
  private pruneMessages(importantIds: string[]): string[] {
    if (!this.currentState) return [];

    const messages = this.currentState.conversation.messages;
    const toKeep: string[] = [];
    
    // Keep important messages
    toKeep.push(...importantIds);
    
    // Calculate token budget for additional messages
    const importantTokens = messages
      .filter(m => importantIds.includes(m.id))
      .reduce((sum, m) => sum + m.tokens, 0);
    
    const remainingTokens = this.config.maxContextSize - importantTokens;
    const averageTokensPerMessage = 200; // Estimate
    const additionalMessages = Math.floor(remainingTokens / averageTokensPerMessage);
    
    // Add recent non-important messages up to budget
    const nonImportant = messages
      .filter(m => !importantIds.includes(m.id))
      .slice(-additionalMessages);
    
    toKeep.push(...nonImportant.map(m => m.id));
    
    return [...new Set(toKeep)];
  }

  /**
   * Update health metrics
   */
  private async updateHealthMetrics(): Promise<void> {
    if (!this.currentState) return;

    const health = this.currentState.health;
    const now = new Date();
    
    // Quality assessment
    health.quality = this.assessContextQuality();
    
    // Coherence assessment
    health.coherence = this.assessCoherence();
    
    // Completeness assessment
    health.completeness = this.assessCompleteness();
    
    health.lastValidation = now;
    
    // Check for issues
    health.issues = this.identifyHealthIssues();
    
    // Emit warning if health is degraded
    const overallHealth = (health.quality + health.coherence + health.completeness) / 3;
    if (overallHealth < this.config.qualityThreshold) {
      this.emit('health_warning', { 
        health: overallHealth,
        issues: health.issues
      });
    }
  }

  /**
   * Assess context quality
   */
  private assessContextQuality(): number {
    if (!this.currentState) return 0;

    let score = 1.0;
    const messages = this.currentState.conversation.messages;
    
    // Penalize for excessive message count
    if (messages.length > 100) {
      score -= 0.1;
    }
    
    // Penalize for token bloat
    const totalTokens = messages.reduce((sum, msg) => sum + msg.tokens, 0);
    if (totalTokens > this.config.maxContextSize * 0.8) {
      score -= 0.2;
    }
    
    // Reward for balanced conversation
    const userMessages = messages.filter(m => m.role === 'user').length;
    const assistantMessages = messages.filter(m => m.role === 'assistant').length;
    const ratio = Math.min(userMessages, assistantMessages) / Math.max(userMessages, assistantMessages, 1);
    score *= (0.5 + ratio * 0.5);
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Assess context coherence
   */
  private assessCoherence(): number {
    if (!this.currentState) return 0;

    let score = 1.0;
    const messages = this.currentState.conversation.messages;
    
    // Check for context switches and confusion
    let topicSwitches = 0;
    let repetitiveQuestions = 0;
    
    for (let i = 1; i < messages.length; i++) {
      const current = messages[i];
      const previous = messages[i - 1];
      
      if (!current || !previous) continue;
      
      // Simple topic switch detection (improvement needed)
      if (current.role === 'user' && previous.role === 'assistant') {
        const similarity = this.calculateStringSimilarity(current.content, previous.content);
        if (similarity < 0.2) {
          topicSwitches++;
        }
      }
      
      // Repetitive question detection
      if (current.role === 'user' && current.content.includes('?')) {
        for (let j = Math.max(0, i - 10); j < i; j++) {
          const msg = messages[j];
          if (msg && msg.role === 'user') {
            const similarity = this.calculateStringSimilarity(current.content, msg.content);
            if (similarity > 0.8) {
              repetitiveQuestions++;
              break;
            }
          }
        }
      }
    }
    
    // Penalize for excessive topic switches
    if (topicSwitches > messages.length * 0.3) {
      score -= 0.3;
    }
    
    // Penalize for repetitive questions
    if (repetitiveQuestions > 3) {
      score -= 0.4;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Assess context completeness
   */
  private assessCompleteness(): number {
    if (!this.currentState) return 0;

    let score = 1.0;
    
    // Check if essential context elements are present
    if (!this.currentState.user.currentTask) {
      score -= 0.2;
    }
    
    if (this.currentState.project.activeFiles.length === 0) {
      score -= 0.1;
    }
    
    if (this.currentState.memory.relevantMemories.length === 0) {
      score -= 0.1;
    }
    
    if (this.currentState.conversation.messages.length === 0) {
      score -= 0.3;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Identify health issues
   */
  private identifyHealthIssues(): ContextIssue[] {
    if (!this.currentState) return [];

    const issues: ContextIssue[] = [];
    const now = new Date();
    
    // Check for token bloat
    const totalTokens = this.currentState.conversation.messages.reduce(
      (sum, msg) => sum + msg.tokens, 0
    );
    
    if (totalTokens > this.config.maxContextSize * 0.9) {
      issues.push({
        type: 'warning',
        category: 'performance',
        message: 'Context approaching token limit',
        suggestion: 'Run context pruning or create checkpoint',
        timestamp: now
      });
    }
    
    // Check for coherence issues
    if (this.currentState.health.coherence < 0.6) {
      issues.push({
        type: 'warning',
        category: 'coherence',
        message: 'Context coherence is degraded',
        suggestion: 'Review conversation flow and consider creating fresh context',
        timestamp: now
      });
    }
    
    // Check for memory issues
    if (this.currentState.memory.relevantMemories.length === 0 && 
        this.currentState.conversation.messages.length > 10) {
      issues.push({
        type: 'warning',
        category: 'memory',
        message: 'No relevant memories loaded',
        suggestion: 'Refresh memory context',
        timestamp: now
      });
    }
    
    // Check for stale context
    const staleThreshold = 2 * 60 * 60 * 1000; // 2 hours
    if (now.getTime() - this.currentState.timestamp.getTime() > staleThreshold) {
      issues.push({
        type: 'warning',
        category: 'performance',
        message: 'Context has not been updated recently',
        suggestion: 'Consider refreshing project state',
        timestamp: now
      });
    }
    
    return issues;
  }

  /**
   * Validate and repair context if needed
   */
  private async validateAndRepair(): Promise<void> {
    if (!this.currentState) return;

    const issues = this.identifyHealthIssues();
    let repaired = false;
    
    for (const issue of issues) {
      switch (issue.category) {
        case 'performance':
          if (issue.message.includes('token limit')) {
            await this.intelligentPruning();
            repaired = true;
          }
          break;
          
        case 'coherence':
          // Could implement coherence repair here
          break;
          
        case 'memory':
          // Could refresh memory context here
          break;
      }
    }
    
    if (repaired) {
      await this.saveContext('auto_repair');
      this.emit('context_repaired', { issues });
    }
  }

  /**
   * Get current context state
   */
  getCurrentState(): ContextState | null {
    return this.currentState;
  }

  /**
   * Get context versions
   */
  getVersions(): ContextVersion[] {
    return Array.from(this.versions.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * Get context summary for AI agent
   */
  getContextSummary(): string {
    if (!this.currentState) return '';

    const messages = this.currentState.conversation.messages;
    const recentMessages = messages.slice(-5);
    
    let summary = '## Current Context Summary:\n\n';
    
    // Current task
    if (this.currentState.user.currentTask) {
      summary += `**Current Task:** ${this.currentState.user.currentTask}\n\n`;
    }
    
    // Recent conversation
    if (recentMessages.length > 0) {
      summary += '**Recent Conversation:**\n';
      for (const msg of recentMessages) {
        const role = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
        const content = msg.content.length > 200 ? 
          msg.content.substring(0, 200) + '...' : 
          msg.content;
        summary += `- **${role}:** ${content}\n`;
      }
      summary += '\n';
    }
    
    // Active files
    if (this.currentState.project.activeFiles.length > 0) {
      summary += `**Active Files:** ${this.currentState.project.activeFiles.join(', ')}\n\n`;
    }
    
    // Recent tools
    const recentTools = this.currentState.ai.toolsUsed.slice(-5);
    if (recentTools.length > 0) {
      summary += `**Recent Tools Used:** ${recentTools.join(', ')}\n\n`;
    }
    
    // Health status
    const health = this.currentState.health;
    summary += `**Context Health:** Quality: ${(health.quality * 100).toFixed(0)}%, `;
    summary += `Coherence: ${(health.coherence * 100).toFixed(0)}%, `;
    summary += `Completeness: ${(health.completeness * 100).toFixed(0)}%\n`;
    
    return summary;
  }

  /**
   * Private helper methods
   */
  private async analyzeProjectStructure(): Promise<ProjectStructure> {
    // Basic implementation - could be enhanced
    const structure: ProjectStructure = {
      rootPath: this.projectPath,
      files: [],
      dependencies: [],
      framework: 'unknown',
      language: 'unknown'
    };

    try {
      // Read package.json if it exists
      const packagePath = path.join(this.projectPath, 'package.json');
      if (await fs.pathExists(packagePath)) {
        const packageJson = await fs.readJSON(packagePath);
        structure.dependencies = Object.keys(packageJson.dependencies || {});
        
        // Detect framework
        if (packageJson.dependencies?.react) structure.framework = 'react';
        else if (packageJson.dependencies?.vue) structure.framework = 'vue';
        else if (packageJson.dependencies?.angular) structure.framework = 'angular';
        
        structure.language = 'javascript';
        if (packageJson.dependencies?.typescript || packageJson.devDependencies?.typescript) {
          structure.language = 'typescript';
        }
      }
    } catch (error) {
      // Ignore errors, use defaults
    }

    return structure;
  }

  private async analyzeDependencies(): Promise<DependencyMap> {
    const deps: DependencyMap = {};
    
    try {
      const packagePath = path.join(this.projectPath, 'package.json');
      if (await fs.pathExists(packagePath)) {
        const packageJson = await fs.readJSON(packagePath);
        
        // Process production dependencies
        for (const [name, version] of Object.entries(packageJson.dependencies || {})) {
          deps[name] = {
            version: version as string,
            type: 'prod',
            dependencies: []
          };
        }
        
        // Process development dependencies
        for (const [name, version] of Object.entries(packageJson.devDependencies || {})) {
          deps[name] = {
            version: version as string,
            type: 'dev',
            dependencies: []
          };
        }
        
        // Process peer dependencies
        for (const [name, version] of Object.entries(packageJson.peerDependencies || {})) {
          deps[name] = {
            version: version as string,
            type: 'peer',
            dependencies: []
          };
        }
      }
    } catch (error) {
      console.warn('Warning: Failed to analyze dependencies:', error);
    }

    return deps;
  }

  /**
   * Start autosave background process
   */
  private startAutosave(): void {
    this.autosaveInterval = setInterval(async () => {
      if (this.currentState) {
        try {
          await this.saveContext('autosave');
        } catch (error) {
          console.warn('Autosave failed:', error);
        }
      }
    }, this.config.autosaveInterval);
  }

  /**
   * Start health monitoring background process
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      if (this.currentState) {
        try {
          await this.updateHealthMetrics();
          await this.validateAndRepair();
        } catch (error) {
          console.warn('Health check failed:', error);
        }
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Save current context to disk
   */
  private async saveContext(reason: string): Promise<void> {
    if (!this.currentState) return;

    try {
      const sessionPath = path.join(this.contextPath, `${this.currentState.sessionId}.json`);
      const versionsData = Array.from(this.versions.entries()).reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {} as Record<string, ContextVersion>);

      const data = {
        state: this.currentState,
        versions: versionsData,
        savedAt: new Date().toISOString(),
        reason
      };

      await fs.writeJSON(sessionPath, data, { spaces: 2 });
      this.emit('context_saved', { reason, path: sessionPath });
    } catch (error) {
      this.emit('save_error', error);
      throw error;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get recent changes summary
   */
  private getRecentChanges(): string[] {
    if (!this.currentState) return [];

    const changes: string[] = [];
    
    // Recent file changes
    const recentChanges = this.currentState.project.recentChanges.slice(-10);
    for (const change of recentChanges) {
      changes.push(`${change.type}: ${change.path}`);
    }
    
    // Recent conversation activity
    const recentMessages = this.currentState.conversation.messages.slice(-5);
    for (const msg of recentMessages) {
      changes.push(`message: ${msg.role} (${msg.tokens} tokens)`);
    }

    return changes;
  }

  /**
   * Cleanup old versions to prevent storage bloat
   */
  private async cleanupOldVersions(): Promise<void> {
    if (this.versions.size <= this.config.maxVersions) return;

    // Sort versions by timestamp, keep the most recent ones
    const sortedVersions = Array.from(this.versions.entries())
      .sort(([, a], [, b]) => b.timestamp.getTime() - a.timestamp.getTime());

    // Remove oldest versions
    const toRemove = sortedVersions.slice(this.config.maxVersions);
    for (const [id] of toRemove) {
      this.versions.delete(id);
    }

    this.emit('versions_cleaned', { removed: toRemove.length });
  }

  /**
   * Calculate advanced semantic similarity using multiple algorithms
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    // 1. Jaccard similarity with n-grams
    const jaccardScore = this.calculateJaccardSimilarity(str1, str2);
    
    // 2. Cosine similarity with TF-IDF weighting
    const cosineScore = this.calculateCosineSimilarity(str1, str2);
    
    // 3. Levenshtein distance normalized
    const levenshteinScore = this.calculateLevenshteinSimilarity(str1, str2);
    
    // 4. Semantic similarity based on context
    const semanticScore = this.calculateSemanticSimilarity(str1, str2);
    
    // Weighted combination for optimal results
    return (jaccardScore * 0.3 + cosineScore * 0.3 + levenshteinScore * 0.2 + semanticScore * 0.2);
  }

  private calculateJaccardSimilarity(str1: string, str2: string): number {
    const ngrams1 = this.generateNGrams(str1.toLowerCase(), 3);
    const ngrams2 = this.generateNGrams(str2.toLowerCase(), 3);
    
    const set1 = new Set(ngrams1);
    const set2 = new Set(ngrams2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  private generateNGrams(text: string, n: number): string[] {
    const ngrams: string[] = [];
    const cleaned = text.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    
    for (let i = 0; i <= cleaned.length - n; i++) {
      ngrams.push(cleaned.substring(i, i + n));
    }
    return ngrams;
  }

  private calculateCosineSimilarity(str1: string, str2: string): number {
    const words1 = this.tokenizeAndWeight(str1);
    const words2 = this.tokenizeAndWeight(str2);
    
    if (!words1 || !words2) return 0;
    
    const allWords = new Set([...Object.keys(words1), ...Object.keys(words2)]);
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (const word of allWords) {
      const weight1 = words1[word] ?? 0;
      const weight2 = words2[word] ?? 0;
      
      dotProduct += weight1 * weight2;
      norm1 += weight1 * weight1;
      norm2 += weight2 * weight2;
    }
    
    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  private tokenizeAndWeight(text: string): Record<string, number> {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    const wordCount: Record<string, number> = {};
    const totalWords = words.length;
    
    // Calculate term frequency
    for (const word of words) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
    
    // Apply TF-IDF-like weighting
    const weightedWords: Record<string, number> = {};
    for (const [word, count] of Object.entries(wordCount)) {
      // Simple TF-IDF: (count / totalWords) * log(rarity_factor)
      const tf = count / totalWords;
      const rarity = Math.log(totalWords / count + 1); // Simplified IDF
      weightedWords[word] = tf * rarity;
    }
    
    return weightedWords;
  }

  private calculateLevenshteinSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : 1 - (distance / maxLength);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(0).map(() => Array(str1.length + 1).fill(0));
    
    for (let i = 0; i <= str1.length; i++) {
      const row = matrix[0];
      if (row) row[i] = i;
    }
    
    for (let j = 0; j <= str2.length; j++) {
      const row = matrix[j];
      if (row) row[0] = j;
    }
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        const currentRow = matrix[j];
        const prevRow = matrix[j - 1];
        
        if (currentRow && prevRow) {
          const deletion = (currentRow[i - 1] ?? 0) + 1;
          const insertion = (prevRow[i] ?? 0) + 1;
          const substitution = (prevRow[i - 1] ?? 0) + indicator;
          
          currentRow[i] = Math.min(deletion, insertion, substitution);
        }
      }
    }
    
    const finalRow = matrix[str2.length];
    return finalRow ? (finalRow[str1.length] ?? 0) : 0;
  }

  private calculateSemanticSimilarity(str1: string, str2: string): number {
    // Advanced semantic analysis based on context patterns
    const patterns1 = this.extractSemanticPatterns(str1);
    const patterns2 = this.extractSemanticPatterns(str2);
    
    let commonPatterns = 0;
    let totalPatterns = Math.max(patterns1.length, patterns2.length);
    
    if (totalPatterns === 0) return 0;
    
    for (const pattern1 of patterns1) {
      for (const pattern2 of patterns2) {
        if (pattern1.type === pattern2.type && 
            this.calculateJaccardSimilarity(pattern1.content, pattern2.content) > 0.7) {
          commonPatterns++;
          break;
        }
      }
    }
    
    return commonPatterns / totalPatterns;
  }

  private extractSemanticPatterns(text: string): Array<{type: string; content: string}> {
    const patterns: Array<{type: string; content: string}> = [];
    
    // Code patterns
    const codeMatches = text.match(/```[\s\S]*?```/g) || [];
    codeMatches.forEach(match => patterns.push({type: 'code', content: match}));
    
    // Question patterns
    const questionMatches = text.match(/[^.!?]*\?[^.!?]*/g) || [];
    questionMatches.forEach(match => patterns.push({type: 'question', content: match.trim()}));
    
    // Error patterns
    const errorMatches = text.match(/error[^.!?]*[.!?]/gi) || [];
    errorMatches.forEach(match => patterns.push({type: 'error', content: match}));
    
    // Command patterns
    const commandMatches = text.match(/\b(create|build|fix|update|delete|install|run)\s+[^.!?]*/gi) || [];
    commandMatches.forEach(match => patterns.push({type: 'command', content: match}));
    
    // Technical terms
    const techMatches = text.match(/\b(function|class|method|variable|array|object|database|server|client|api|endpoint)\b[^.!?]*/gi) || [];
    techMatches.forEach(match => patterns.push({type: 'technical', content: match}));
    
    return patterns;
  }

  /**
   * Cleanup resources and stop background processes
   */
  async cleanup(): Promise<void> {
    if (this.autosaveInterval) {
      clearInterval(this.autosaveInterval);
      this.autosaveInterval = null;
    }
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // Final save
    if (this.currentState) {
      await this.saveContext('cleanup');
    }
    
    this.emit('cleanup_complete');
  }

  /**
   * Get context health status
   */
  getHealthStatus(): { status: string; score: number; issues: ContextIssue[] } {
    if (!this.currentState) {
      return { status: 'uninitialized', score: 0, issues: [] };
    }

    const health = this.currentState.health;
    const score = (health.quality + health.coherence + health.completeness) / 3;
    
    let status = 'healthy';
    if (score < 0.5) status = 'critical';
    else if (score < 0.7) status = 'degraded';
    else if (score < 0.9) status = 'warning';

    return {
      status,
      score,
      issues: health.issues
    };
  }

  /**
   * Force context refresh
   */
  async refreshContext(): Promise<void> {
    if (!this.currentState) return;

    // Update project structure
    this.currentState.project.structure = await this.analyzeProjectStructure();
    this.currentState.project.dependencies = await this.analyzeDependencies();
    
    // Reset health metrics
    await this.updateHealthMetrics();
    
    // Save changes
    await this.saveContext('refresh');
    
    this.emit('context_refreshed');
  }
}

/**
 * Copyright (c) 2025 OpenAgent Team
 * Licensed under the MIT License
 *
 * LangGraph-based OpenAgent 
 * Provides vendor-independent AI agent with advanced memory, validation, and optimization
 */


import { initChatModel } from "langchain/chat_models/universal";
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { InMemoryStore, type LangGraphRunnableConfig } from '@langchain/langgraph';
import { MemorySaver } from "@langchain/langgraph-checkpoint";

import { tool } from '@langchain/core/tools';
import { isAIMessageChunk } from '@langchain/core/messages';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

import { AgentConfig, AgentResponse, AgentContext } from '../types/agent.js';
import { OPENAGENT_SYSTEM_PROMPT } from '../prompts/openagent_prompt.js';
import { TokenCounter } from '../core/tokens/TokenCounter.js';
import { ContextManager } from '../core/context/ContextManager.js';
import { TokenOptimizer } from '../core/optimization/TokenOptimizer.js';
import { ValidationEngine } from '../core/validation/ValidationEngine.js';
import { MemoryIntegration } from '../memory/index.js';
import { MCPClientManager } from '../mcp/client/MCPClient.js';


// Configuration interface for OpenAgent
export interface OpenAgentConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  memoryEnabled: boolean;
  streamingEnabled: boolean;
  humanInLoopEnabled: boolean;
  checkpointsEnabled: boolean;
}

// Default configuration
const DEFAULT_CONFIG: OpenAgentConfig = {
  model: "anthropic:claude-sonnet-4-20250514",
  temperature: 0.1,
  maxTokens: 4000,
  memoryEnabled: true,
  streamingEnabled: true,
  humanInLoopEnabled: true,
  checkpointsEnabled: true,
};

export class OpenAgent {
  private agent: any;
  private config: AgentConfig;
  private openAgentConfig: OpenAgentConfig;
  private tokenCounter: TokenCounter;
  private contextManager: ContextManager;
  private tokenOptimizer: TokenOptimizer;
  private validationEngine: ValidationEngine;
  private memoryIntegration: MemoryIntegration;
  private store: InMemoryStore;
  private checkpointer: MemorySaver;
  private context: AgentContext;
  private chatModel: any;
  private customRules: string;
  private mcpClient: MCPClientManager;

  constructor(apiKey: string, context: AgentContext, _mcpServers: any[] = [], customRules: string = '') {
    this.context = context;
    this.customRules = customRules;
    
    // Initialize configuration (will be loaded from file later)
    this.openAgentConfig = DEFAULT_CONFIG;
    
    // Initialize core systems
    this.tokenCounter = new TokenCounter(apiKey);
    this.contextManager = new ContextManager(context.projectPath, apiKey);
    this.tokenOptimizer = new TokenOptimizer(context.projectPath);
    this.validationEngine = new ValidationEngine(context.projectPath, {
      enabled: true,
      strictMode: false,
      securityScanEnabled: true,
      performanceCheckEnabled: true,
      hallucinationDetectionEnabled: true,
      maxValidationTime: 30000,
      qualityThreshold: 0.8
    });
    
    // Initialize memory system (same as MainAgent)
    this.memoryIntegration = new MemoryIntegration(context.projectPath, context.session.id);

    // Initialize MCP client for filesystem operations
    this.mcpClient = new MCPClientManager(context.projectPath);

    // Initialize LangGraph components
    this.store = new InMemoryStore();
    this.checkpointer = new MemorySaver();

    this.config = {
      id: "openagent-langgraph",
      name: "OpenAgent LangGraph",
      description: "Advanced AI development assistant powered by LangGraph",
      model: "claude-3-5-sonnet-20241022",
      systemPrompt: this.buildSystemPrompt(),
      tools: [],
      capabilities: [
        {
          name: "code_development",
          description: "Write, analyze, and optimize code",
          enabled: true,
        },
        {
          name: "project_management", 
          description: "Manage project structure and dependencies",
          enabled: true,
        },
        {
          name: "problem_solving",
          description: "Debug and solve complex development issues",
          enabled: true,
        },
        {
          name: "memory_learning",
          description: "Learn from interactions and remember context",
          enabled: true,
        },
        {
          name: "human_interaction",
          description: "Human-in-the-loop workflows with approval steps",
          enabled: true,
        }
      ],
      maxTokens: 4096,
      temperature: 0.1,
      metadata: {
        category: "development",
        tags: ["langgraph", "claude", "development", "memory", "streaming"],
        author: "OpenAgent",
        version: "2.0.0",
        created: new Date(),
        updated: new Date(),
        usage: {
          totalCalls: 0,
          successRate: 0,
          avgResponseTime: 0,
        },
      },
    };
  }

  /**
   * Initialize the LangGraph agent and all systems
   */
  public async initialize(): Promise<void> {
    try {
      // Load configuration from .openagent/config.json
      await this.loadConfiguration();
      
      // Initialize universal chat model
      this.chatModel = await initChatModel(this.openAgentConfig.model, {
        temperature: this.openAgentConfig.temperature,
        maxTokens: this.openAgentConfig.maxTokens,
        streaming: this.openAgentConfig.streamingEnabled
      });

      // Chat model initialized successfully - silent for clean UX

      // Initialize core systems
      await this.ensureSystemsInitialized();

      // Create memory tools for the agent
      const memoryTools = this.createMemoryTools();

      // Get MCP tools (filesystem operations)
      const mcpTools = await this.mcpClient.getTools();

      // Combine all tools
      const allTools = [...memoryTools, ...mcpTools];

      // Create the LangGraph ReAct agent
      this.agent = createReactAgent({
        llm: this.chatModel,
        tools: allTools,
        stateModifier: await this.buildContextualSystemPrompt(),
        checkpointSaver: this.checkpointer,
        interruptBefore: [], // Disable interrupts for now to fix basic functionality
      });

      //console.log(chalk.green('🚀 OpenAgent LangGraph agent initialized successfully!'));
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize OpenAgent agent:'), error);
      throw error;
    }
  }

  /**
   * Load configuration from .openagent/config.json with automatic generation
   */
  private async loadConfiguration(): Promise<void> {
    const configPath = path.join(this.context.projectPath, '.openagent', 'config.json');
    
    try {
      // Check if config file exists
      const configContent = await fs.readFile(configPath, 'utf-8');
      const loadedConfig = JSON.parse(configContent);
      
      // Merge with defaults
      this.openAgentConfig = { ...DEFAULT_CONFIG, ...loadedConfig };
      
      // Configuration loaded successfully - silent for clean UX
    } catch (error) {
      // Config file doesn't exist or is invalid, create it
      console.log(chalk.yellow('📋 Creating default config.json...'));
      
      await this.createDefaultConfig(configPath);
      this.openAgentConfig = { ...DEFAULT_CONFIG };
    }
  }

  /**
   * Create default configuration file in .openagent folder
   */
  private async createDefaultConfig(configPath: string): Promise<void> {
    const configDir = path.dirname(configPath);
    
    // Ensure .openagent directory exists
    await fs.mkdir(configDir, { recursive: true });
    
    // Create clean JSON config
    const cleanConfig = {
      model: DEFAULT_CONFIG.model,
      temperature: DEFAULT_CONFIG.temperature,
      maxTokens: DEFAULT_CONFIG.maxTokens,
      memoryEnabled: DEFAULT_CONFIG.memoryEnabled,
      streamingEnabled: DEFAULT_CONFIG.streamingEnabled,
      humanInLoopEnabled: DEFAULT_CONFIG.humanInLoopEnabled,
      checkpointsEnabled: DEFAULT_CONFIG.checkpointsEnabled,
      systemPrompt: DEFAULT_CONFIG.systemPrompt
    };
    
    await fs.writeFile(configPath, JSON.stringify(cleanConfig, null, 2));
    console.log(chalk.green(`✅ Created config.json at ${configPath}`));
  }

  /**
   * Process user message with full LangGraph capabilities
   */
  public async processMessage(message: string, config?: { threadId?: string; humanApproval?: boolean }): Promise<AgentResponse> {
    const startTime = Date.now();
    // Use consistent thread ID for memory persistence - FIXED: Use user session ID as default thread
    const threadId = config?.threadId || `thread-${this.context.session.id}`;

    try {
      // Update context with user message
      try {
        await this.contextManager.updateConversation('user', message);
        await this.contextManager.updateUser(message, [], {});
      } catch (contextError) {
        console.error('❌ Context update failed:', contextError);
        throw contextError;
      }
      // Context updated successfully - silent for clean UX

      // Create simple, clean messages for LangGraph (NO OPTIMIZATION TO PREVENT CORRUPTION)
      const messages = [
        { role: "user", content: message }
      ];
      // Messages prepared for LangGraph processing
      
      // Prepare LangGraph configuration with proper user ID for cross-thread persistence
      const runConfig: LangGraphRunnableConfig = {
        configurable: {
          thread_id: threadId,
          userId: this.context.session.id  // FIXED: Use userId instead of user_id for LangGraph Store
        },
        store: this.store
      };
      // LangGraph configuration ready

      let finalResponse = '';
      let totalUsage = { input_tokens: 0, output_tokens: 0 };

      // Create agent stream
      
      // Stream the agent response with multiple modes for enhanced tool visibility
      const stream = await this.agent.stream(
        { messages },
        {
          ...runConfig,
          streamMode: ["updates", "debug", "messages"]  // Enhanced streaming: tools + content
        }
      );
      // Process streaming response
      // Handle streaming response
      const streamResult = await this.handleLangGraphStream(stream);
      finalResponse = streamResult.content;
      totalUsage = streamResult.usage;
      // Stream processing completed

      // Display cost information
      this.displayCost(totalUsage);

      // Update context with AI response
      await this.contextManager.updateConversation('assistant', finalResponse);

      // Learn from this interaction (simplified)
      if (finalResponse) {
        await this.learnFromInteraction(message, finalResponse, { metadata: {} }, streamResult.toolUses);
      }

      const response: AgentResponse = {
        success: true,
        content: finalResponse,
        toolUses: streamResult.toolUses,
        metadata: {
          modelUsed: this.config.model,
          tokensUsed: {
            input: totalUsage.input_tokens,
            output: totalUsage.output_tokens,
            cached: 0
          },
          responseTime: Date.now() - startTime,
          confidence: 0.9,
          reasoning: `Processed using LangGraph ReAct agent in thread ${threadId}`
        }
      };

      // Update context
      await this.contextManager.updateAI(
        this.config.model,
        response.metadata.confidence,
        [`Generated response with ${response.content.length} characters`],
        streamResult.toolUses.map(t => t.name)
      );

      // Track usage (no optimization to prevent corruption)
      await this.tokenOptimizer.trackUsage(
        totalUsage.input_tokens,
        totalUsage.output_tokens,
        this.config.model,
        0 
      );

      // Validate generated code if response exists
      if (finalResponse) {
        await this.validateGeneratedCode(finalResponse);
      }

      return response;

    } catch (error) {
      return this.createErrorResponse(error as Error, startTime);
    }
  }

  /**
   * Handle human-in-the-loop approval workflow
   */
  public async resumeWithApproval(threadId: string, approved: boolean, modifications?: any): Promise<AgentResponse> {
    const runConfig: LangGraphRunnableConfig = {
      configurable: {
        thread_id: threadId,
        userId: this.context.session.id  // FIXED: Use userId for consistency with Store API
      },
      store: this.store
    };

    try {
      if (!approved && modifications) {
        // Update the agent state with modifications
        await this.agent.updateState(runConfig, modifications);
      }

      // Resume the agent execution
      const stream = await this.agent.stream(null, {
        ...runConfig,
        streamMode: ["values", "messages"]
      });

      const streamResult = await this.handleLangGraphStream(stream);

      return {
        success: true,
        content: streamResult.content,
        toolUses: streamResult.toolUses,
        metadata: {
          modelUsed: this.config.model,
          tokensUsed: {
            input: streamResult.usage.input_tokens,
            output: streamResult.usage.output_tokens,
            cached: 0
          },
          responseTime: Date.now() - Date.now(),
          confidence: 0.9
        }
      };
    } catch (error) {
      return this.createErrorResponse(error as Error, Date.now());
    }
  }

  /**
   * Get agent state for human-in-the-loop workflows
   */
  public async getAgentState(threadId: string): Promise<any> {
    const runConfig: LangGraphRunnableConfig = {
      configurable: {
        thread_id: threadId,
        userId: this.context.session.id  
      }
    };

    return await this.agent.getState(runConfig);
  }

  /**
   * Handle LangGraph streaming response with enhanced tool visibility
   * Using multiple streaming modes: ["updates", "debug"] for detailed tool tracking
   */
  private async handleLangGraphStream(stream: any): Promise<{
    content: string;
    toolUses: any[];
    usage: { input_tokens: number; output_tokens: number };
  }> {
    let fullContent = '';
    const toolUses: any[] = [];
    let usage = { input_tokens: 0, output_tokens: 0 };
    let hasStartedStreaming = false;
    

    try {
      const { globalStreamingHandler } = await import('../cli/index.js').catch(() => ({ globalStreamingHandler: null }));

      // Stop spinner immediately when streaming starts to prevent interference
      if (globalStreamingHandler) {
        globalStreamingHandler.stop();
      }

      // Process enhanced streaming with updates and debug info
      for await (const [streamType, streamData] of stream) {
        if (streamType === 'updates') {
          // Handle update events for tool calls and content
          const result = await this.handleUpdateEvent(streamData);
          
          if (result.content) {
            fullContent += result.content;
            if (!hasStartedStreaming) {
              hasStartedStreaming = true;
            }
          }
          
          if (result.toolUses.length > 0) {
            toolUses.push(...result.toolUses);
          }
          
          if (result.usage.input_tokens > 0 || result.usage.output_tokens > 0) {
            usage.input_tokens += result.usage.input_tokens;
            usage.output_tokens += result.usage.output_tokens;
          }
        } else if (streamType === 'debug') {
          // Handle debug events for step visibility
          this.handleDebugEvent(streamData);
        } else if (streamType === 'messages') {
          // Handle message streaming (actual LLM response content)
          this.handleMessageStream(streamData);
          if (!hasStartedStreaming) {
            hasStartedStreaming = true;
          }
        }
      }

      if (hasStartedStreaming && fullContent.trim()) {
        process.stdout.write('\n');
      }

    } catch (error) {
      console.error(chalk.red('Error handling enhanced LangGraph stream:'), error);
    }

    return { content: fullContent, toolUses, usage };
  }

  /**
   * Handle debug events for step-by-step execution visibility
   */
  private handleDebugEvent(debugData: any): void {
    try {
      if (debugData.type === 'task') {
        const { payload } = debugData;
        const { name } = payload;
        
        if (name === 'tools') {
          // Show when tools are being executed
          console.log(chalk.cyan('🔧 Using tools...'));
        }
      }
    } catch (error) {
      // Silent fail for debug events
    }
  }

  /**
   * Handle update events for tool calls and content streaming
   */
  private async handleUpdateEvent(
    updateData: any,
    
  ): Promise<{
    content: string;
    toolUses: any[];
    usage: { input_tokens: number; output_tokens: number };
  }> {
    let content = '';
    let toolUses: any[] = [];
    let usage = { input_tokens: 0, output_tokens: 0 };

    try {
      // Handle agent updates (AI messages with tool calls)
      if (updateData.agent?.messages) {
        for (const message of updateData.agent.messages) {
          if (isAIMessageChunk(message)) {
            // Handle tool calls - show clean, minimal info
            if (message.tool_calls && message.tool_calls.length > 0) {
              for (const toolCall of message.tool_calls) {
                // Clean, single-line tool call notification
                console.log(chalk.cyan(`🔧 ${toolCall.name}`));
                
                toolUses.push({
                  id: toolCall.id,
                  name: toolCall.name,
                  input: toolCall.args
                });
              }
            }
            
            // Handle content streaming
            if (message.content && typeof message.content === 'string') {
              process.stdout.write(message.content);
              content += message.content;
            }
            
            // Extract usage metadata
            if (message.usage_metadata) {
              usage.input_tokens += message.usage_metadata.input_tokens || 0;
              usage.output_tokens += message.usage_metadata.output_tokens || 0;
            }
          }
        }
      }
      
      // Tool results are now silent to reduce clutter
      // Results will be shown in the main response

    } catch (error) {
      // Silent error handling to avoid cluttering output
    }

    return { content, toolUses, usage };
  }

  /**
   * Handle message streaming for real-time LLM response content
   */
  private handleMessageStream(messageData: any): void {
    try {
      const [message, _metadata] = messageData;
      
      // Content is in message.content[0].text format for Anthropic models
      if (message && message.content && Array.isArray(message.content) && message.content[0] && message.content[0].text) {
        process.stdout.write(message.content[0].text);
      }
    } catch (error) {
      // Silent fail to avoid cluttering output
    }
  }

  /**
   * Create memory management tools using correct MemoryIntegration API
   */
  private createMemoryTools(): any[] {
    return [
      tool(async (input: unknown, config?: LangGraphRunnableConfig) => {
        const { content, context } = input as { content: string; context?: string };
        
        try {
          // FIXED: Use LangGraph Store API for proper cross-thread persistence
          const store = config?.store;
          if (!store) {
            return "Error: Store not available for memory operations.";
          }
          
          const userId = config?.configurable?.['userId'];
          if (!userId) {
            return "Error: User ID required for memory operations.";
          }
          
          // Use proper namespace following LangGraph patterns: ["memories", userId]
          const namespace = ["memories", userId];
          const memoryId = uuidv4();
          
          // Store memory with proper metadata
          await store.put(namespace, memoryId, {
            data: content,
            context: context || '',
            source: 'ai_tool',
            timestamp: new Date().toISOString(),
            type: 'user_memory'
          });
          
          return "Memory stored successfully in cross-thread persistent store.";
        } catch (error) {
          console.error('Error storing memory:', error);
          return `Error storing memory: ${error instanceof Error ? error.message : String(error)}`;
        }
      }, {
        name: "store_memory",
        description: "Store information in long-term memory for future reference. Use this to remember user preferences, names, or important context."
      }),

      tool(async (input: unknown, config?: LangGraphRunnableConfig) => {
        // FIXED: Handle different input formats and add null checks
        let query: string = '';
        let limit: number = 5;
        
        if (typeof input === 'string') {
          query = input;
        } else if (input && typeof input === 'object') {
          const inputObj = input as any;
          query = inputObj.input || inputObj.query || '';
          limit = inputObj.limit || 5;
        }
        
        // FIXED: Add null check for query parameter
        if (!query || typeof query !== 'string') {
          return "Error: Search query is required and must be a string.";
        }
        
        try {
          // FIXED: Use LangGraph Store API for searching memories
          const store = config?.store;
          if (!store) {
            return "Error: Store not available for memory operations.";
          }
          
          const userId = config?.configurable?.['userId'];
          if (!userId) {
            return "Error: User ID required for memory operations.";
          }
          
          // Search in proper namespace
          const namespace = ["memories", userId];
          const memories = await store.search(namespace);
          
          if (!memories || memories.length === 0) {
            return "No memories found for this user.";
          }
          
          // Simple text matching for now (could be enhanced with embeddings)
          const relevantMemories = memories
            .filter(memory => {
              try {
                const memoryData = memory.value;
                // FIXED: Add comprehensive null checks
                const dataText = (memoryData && memoryData['data']) ? String(memoryData['data']) : '';
                const contextText = (memoryData && memoryData['context']) ? String(memoryData['context']) : '';
                const searchableText = `${dataText} ${contextText}`.toLowerCase();
                const queryLower = query.toLowerCase();
                return searchableText.includes(queryLower);
              } catch (err) {
                console.error('Error filtering memory:', err);
                return false; // Skip this memory if there's an error
              }
            })
            .slice(0, limit);
          
          if (relevantMemories.length === 0) {
            return `No relevant memories found for query: "${query}"`;
          }
          
          // Return formatted results with null checks
          return relevantMemories.map((memory, index) => {
            try {
              const data = memory.value || {};
              const memoryData = data['data'] || 'No data';
              const memoryContext = data['context'] || 'No context';
              const memoryTimestamp = data['timestamp'] || 'Unknown time';
              return `Memory ${index + 1}: ${memoryData}\nContext: ${memoryContext}\nStored: ${memoryTimestamp}`;
            } catch (err) {
              return `Memory ${index + 1}: Error reading memory data`;
            }
          }).join('\n\n---\n\n');
          
        } catch (error) {
          console.error('Error searching memory:', error);
          return `Error searching memory: ${error instanceof Error ? error.message : String(error)}`;
        }
      }, {
        name: "search_memory",
        description: "Search through stored memories using text matching. Input should be a search query string to find relevant memories."
      })
    ];
  }

  

  /**
   * Ensure all core systems are initialized
   */
  private async ensureSystemsInitialized(): Promise<void> {
    // Initialize memory system if not already done
    if (!this.memoryIntegration) {
      throw new Error('Memory system not initialized');
    }
    
    // Initialize memory
    await this.memoryIntegration.initialize();
    
    // Initialize MCP client
    if (!this.mcpClient.isInitialized()) {
      await this.mcpClient.initialize();
    }
    
    // Initialize context manager with session ID
    await this.contextManager.initialize(this.context.session.id);
    
    // Initialize token optimizer
    await this.tokenOptimizer.initialize();
    
    // Initialize validation engine
    await this.validationEngine.initialize();
  }

  /**
   * Build contextual system prompt for LangGraph
   */
  private async buildContextualSystemPrompt(): Promise<string> {
    // Get base system prompt
    let systemPrompt = this.config.systemPrompt;
    
    // Add context summary without corruption
    try {
      const contextSummary = this.contextManager.getContextSummary();
      if (contextSummary && contextSummary.trim()) {
        systemPrompt += `\n\n## Current Context:\n${contextSummary}`;
      }
    } catch (error) {
      console.warn('Warning: Context summary failed:', error);
    }
    
    return systemPrompt;
  }

  /**
   * Learn from interaction and store in memory
   */
  private async learnFromInteraction(userMessage: string, response: string, metadata: any, toolUses: any[]): Promise<void> {
    try {
      await this.memoryIntegration.learnFromInteraction({
        userMessage,
        response,
        success: true,
        toolsUsed: toolUses.map(t => t.name),
        duration: metadata.metadata.responseTime || 0,
        context: {
          projectId: this.context.session.id,
          sessionId: this.context.session.id
        }
      });
    } catch (error) {
      console.error('Error learning from interaction:', error);
    }
  }

  /**
   * Validate generated code for quality and security
   */
  private async validateGeneratedCode(code: string): Promise<void> {
    try {
      const validation = await this.validationEngine.validateCode(code, 'typescript');
      
      if (!validation.overall.passed && validation.syntax.warnings && validation.syntax.warnings.length > 0) {
        console.warn(chalk.yellow('Code validation warnings:'), validation.syntax.warnings);
      }
    } catch (error) {
      console.error('Error validating code:', error);
    }
  }

  /**
   * Update agent metrics (required by OpenAgentManager)
   */
  public updateMetrics(success: boolean, responseTime: number): void {
    this.config.metadata.usage.totalCalls += 1;
    
    if (success) {
      // Add successfulCalls field if it doesn't exist
      if (!('successfulCalls' in this.config.metadata.usage)) {
        (this.config.metadata.usage as any).successfulCalls = 0;
      }
      (this.config.metadata.usage as any).successfulCalls += 1;
    }
    
    // Update success rate
    const successfulCalls = (this.config.metadata.usage as any).successfulCalls || 0;
    this.config.metadata.usage.successRate = successfulCalls / this.config.metadata.usage.totalCalls;
    
    // Update average response time
    const totalTime = this.config.metadata.usage.avgResponseTime * (this.config.metadata.usage.totalCalls - 1);
    this.config.metadata.usage.avgResponseTime = (totalTime + responseTime) / this.config.metadata.usage.totalCalls;
  }

  /**
   * Get agent configuration (required by OpenAgentManager)
   */
  public getConfig(): AgentConfig {
    return this.config;
  }

  /**
   * Check if agent is initialized (required by OpenAgentManager)
   */
  public isInitialized(): boolean {
    return this.agent !== null && this.memoryIntegration !== null && this.mcpClient.isInitialized();
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    try {
      if (this.mcpClient) {
        await this.mcpClient.close();
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Display cost information to user
   */
  private displayCost(usage: { input_tokens: number; output_tokens: number }): void {
    const costs = this.tokenCounter.calculateCost('claude-3-5-sonnet-20241022', usage.input_tokens, usage.output_tokens);
    console.log(chalk.cyan(`💰 Cost: $${costs.totalCost.toFixed(4)} (${usage.input_tokens} + ${usage.output_tokens} tokens)`));
  }

  /**
   * Create error response
   */
  private createErrorResponse(error: Error, startTime: number): AgentResponse {
    return {
      success: false,
      content: `Error: ${error.message}`,
      toolUses: [],
      metadata: {
        modelUsed: this.config.model,
        tokensUsed: { input: 0, output: 0, cached: 0 },
        responseTime: Date.now() - startTime,
        confidence: 0,
        reasoning: error.message
      }
    };
  }

  /**
   * Build system prompt with custom rules
   */
  private buildSystemPrompt(): string {
    let prompt = OPENAGENT_SYSTEM_PROMPT;
    
    if (this.customRules && this.customRules.trim()) {
      prompt += `\n\n## Custom Project Rules:\n${this.customRules}`;
    }
    
    return prompt;
  }
}

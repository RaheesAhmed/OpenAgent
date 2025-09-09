/**
 * Copyright (c) 2025 OpenAgent Team
 * Licensed under the MIT License
 *
 * LangGraph-based OpenAgent 
 * Provides vendor-independent AI agent with advanced memory, validation, and optimization
 */


import { initChatModel } from "langchain/chat_models/universal";
import { createDeepAgent } from 'deepagents';
import { InMemoryStore, type LangGraphRunnableConfig } from '@langchain/langgraph';

import { tool } from '@langchain/core/tools';
import { isAIMessageChunk } from '@langchain/core/messages';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

import { AgentConfig, AgentResponse, AgentContext } from '../types/agent.js';
import { OPENAGENT_SYSTEM_PROMPT } from '../prompts/openagent_prompt.js';

import { ContextManager } from '../core/context/ContextManager.js';
import { OpenAgentContext } from '../core/context/OpenAgentContext.js';

import { ValidationEngine } from '../core/validation/ValidationEngine.js';
import { MemoryIntegration } from '../memory/index.js';
import { MCPClientManager } from '../mcp/client/MCPClient.js';
import { SubAgentLoader } from '../core/agents/SubAgentLoader.js';

import { allProjectTools, allFileTools, allContextTools } from '../tools/index.js'
import { allTerminalTools } from "../tools/terminal.js";

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

  private contextManager: ContextManager;
  private openAgentContext: OpenAgentContext;

  private validationEngine: ValidationEngine;
  private memoryIntegration: MemoryIntegration;
  private store: InMemoryStore;
  private subAgentLoader: SubAgentLoader;
  
  private context: AgentContext;
  private chatModel: any;
  private customRules: string;
  private mcpClient: MCPClientManager;

  constructor(context: AgentContext,customRules: string = '') {
    this.context = context;
    this.customRules = customRules;
    
    // Initialize configuration (will be loaded from file later)
    this.openAgentConfig = DEFAULT_CONFIG;
    
    // Initialize core systems
 
    this.contextManager = new ContextManager(context.projectPath);
    this.openAgentContext = new OpenAgentContext(context.projectPath);
   
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

    // Initialize sub-agent loader for file-based sub-agents
    this.subAgentLoader = new SubAgentLoader(context.projectPath);

    // Initialize LangGraph components
    this.store = new InMemoryStore();
    

    this.config = {
      id: "openagent",
      name: "OpenAgent",
      description: "Advanced AI development assistant powered by LangGraph",
      model: "claude-sonnet-4-20250514",
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
        },
      ],
      maxTokens: 64000,
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
      
      // Initialize universal chat model with prompt caching enabled
      this.chatModel = await initChatModel(this.openAgentConfig.model, {
        temperature: this.openAgentConfig.temperature,
        maxTokens: this.openAgentConfig.maxTokens,
        streaming: this.openAgentConfig.streamingEnabled,
        // Enable prompt caching for system prompts and tools (saves 90% on repeated content)
        modelKwargs: {
          extra_headers: {
            'anthropic-beta': 'prompt-caching-2024-07-31'
          }
        }
      });

      // Chat model initialized successfully - silent for clean UX

      // Initialize core systems
      await this.ensureSystemsInitialized();

      // Create memory tools for the agent
      const memoryTools = this.createMemoryTools();

      // Get MCP tools (only from mcp-servers.json, no built-in tools)
      const mcpTools = await this.mcpClient.getTools();

      // Combine tools - Deep Agents built-in + our real filesystem tools
      // Deep Agents provides: read_file, write_file, edit_file, ls (virtual filesystem)
      // We provide: create_real_file, read_real_file, etc. (real filesystem)
      const allTools = [
        ...allFileTools, // Real filesystem tools with unique names
        ...memoryTools, // Memory management tools
        ...mcpTools, // MCP server tools
        ...allTerminalTools, // Terminal execution tools
        ...allProjectTools, // Project analysis tools
        ...allContextTools,//OpenAgent Context Tools
      ];

      // Load sub-agents for Deep Agent system
      const subAgents = await this.loadSubAgents();

      // Create the Deep Agent with advanced planning and sub-agent capabilities
      this.agent = createDeepAgent({
        model: this.chatModel,
        tools: allTools,
        instructions: this.buildCleanSystemPrompt(), // Clean system prompt only
        subagents: subAgents,
        // Deep Agents handles checkpointing internally
      });

      
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
      
      // Get project context to include with user message (not system prompt)
      const projectContext = await this.getProjectContext();
      
      // Combine user message with project context
      const enrichedUserMessage = projectContext ?
        `${projectContext}User Request: ${message}` :
        message;
      
      const messages = [
        { role: "user", content: enrichedUserMessage }
      ];
      // Messages prepared for LangGraph processing with project context
      
      // Prepare LangGraph configuration with proper user ID for cross-thread persistence
      const runConfig: LangGraphRunnableConfig = {
        configurable: {
          thread_id: threadId,
          userId: this.context.session.id  // FIXED: Use userId instead of user_id for LangGraph Store
        },
        store: this.store,
        recursionLimit: 100  // FIXED: Increase recursion limit to handle complex multi-step tasks
      };
      // LangGraph configuration ready

      let finalResponse = '';
      let totalUsage = { input_tokens: 0, output_tokens: 0 };

      // Use proper LangGraph streaming patterns from documentation
      // 1. streamEvents for detailed tool tracking
      // 2. stream with messages mode for LLM token streaming
      
      const streamResult = await this.handleProperLangGraphStream({ messages }, runConfig);
      finalResponse = streamResult.content;
      totalUsage = streamResult.usage;
      // Stream processing completed with proper LangGraph patterns

      

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
      store: this.store,
      recursionLimit: 100  // FIXED: Increase recursion limit to handle complex multi-step tasks
    };

    try {
      if (!approved && modifications) {
        // Update the agent state with modifications
        await this.agent.updateState(runConfig, modifications);
      }

      // Resume the agent execution using proper streaming patterns
      const streamResult = await this.handleProperLangGraphStream({ messages: [] }, runConfig);

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
      },
      recursionLimit: 100  // Increased recursion limit to handle complex multi-step tasks
    };

    return await this.agent.getState(runConfig);
  }

  /**
   * Handle LangGraph streaming with proper patterns from documentation
   * Uses streamEvents for tool tracking and stream with messages for LLM tokens
   */
  private async handleProperLangGraphStream(
    input: { messages: any[] },
    runConfig: LangGraphRunnableConfig
  ): Promise<{
    content: string;
    toolUses: any[];
    usage: { input_tokens: number; output_tokens: number };
  }> {
    let fullContent = '';
    const toolUses: any[] = [];
    let usage = { input_tokens: 0, output_tokens: 0 };
    let hasStartedStreaming = false;
    let spinnerStopped = false;
    
    // Get spinner handler once
    const { globalStreamingHandler } = await import('../cli/index.js').catch(() => ({ globalStreamingHandler: null }));
    
    // Function to clear spinner immediately when content detected
    const clearSpinner = () => {
      if (!spinnerStopped && globalStreamingHandler && globalStreamingHandler.isRunning()) {
        globalStreamingHandler.stopAndClear();
        spinnerStopped = true;
        hasStartedStreaming = true;
      }
    };

    try {
      // Method 1: Use streamEvents for comprehensive tool tracking (like the documentation)
      const eventStream = this.agent.streamEvents(
        input,
        { ...runConfig, version: "v2" }
      );

      let messageContentBuffer = '';
      let isProcessingTool = false;

      for await (const { event, name, data } of eventStream) {
        // Handle LLM token streaming
        if (event === "on_chat_model_stream" && isAIMessageChunk(data.chunk)) {
          clearSpinner();
          
          // Handle tool call chunks
          if (data.chunk.tool_call_chunks && data.chunk.tool_call_chunks.length > 0) {
            for (const toolChunk of data.chunk.tool_call_chunks) {
              if (toolChunk.name && !isProcessingTool) {
                console.log(`\n${chalk.dim('🔧')} ${chalk.cyan(toolChunk.name)}`);
                isProcessingTool = true;
                toolUses.push({
                  id: toolChunk.id,
                  name: toolChunk.name,
                  input: toolChunk.args
                });
              }
            }
          }
          
          // Handle content streaming with proper type checking
          if (data.chunk.content) {
            let contentText = '';
            if (typeof data.chunk.content === 'string') {
              contentText = data.chunk.content;
            } else if (Array.isArray(data.chunk.content)) {
              // Handle complex message content format
              contentText = data.chunk.content
                .map((part: any) => {
                  if (typeof part === 'string') {
                    return part;
                  } else if (part && typeof part === 'object' && 'text' in part) {
                    return part.text || '';
                  }
                  return '';
                })
                .join('');
            }
            
            if (contentText) {
              process.stdout.write(contentText);
              messageContentBuffer += contentText;
            }
          }

          // Extract usage metadata
          if (data.chunk.usage_metadata) {
            usage.input_tokens += data.chunk.usage_metadata.input_tokens || 0;
            usage.output_tokens += data.chunk.usage_metadata.output_tokens || 0;
          }
        }

        // Handle tool events
        else if (event === "on_tool_start") {
          clearSpinner();
          const toolName = data.name || name || 'unknown_tool';
          
          // Special handling for TODO tools with beautiful formatting
          if (toolName.includes('todos') || toolName.includes('todo')) {
            console.log(`\n${chalk.blue('📝 Managing Task List...')}`);
            
            // Parse and display beautiful TODO list from input
            if (data.input) {
              try {
                let todoInput = data.input;
                
                // Handle nested input structure
                if (typeof todoInput === 'object' && todoInput.input) {
                  todoInput = todoInput.input;
                }
                
                // Parse JSON string if needed
                if (typeof todoInput === 'string') {
                  todoInput = JSON.parse(todoInput);
                }
                
                if (todoInput.todos && Array.isArray(todoInput.todos)) {
                  console.log(chalk.blue('\n📋 Current Task Progress:'));
                  todoInput.todos.forEach((todo: any, index: number) => {
                    const status = todo.status || 'pending';
                    let statusIcon = '';
                    let statusColor = chalk.gray;
                    
                    switch (status) {
                      case 'completed':
                        statusIcon = '✅';
                        statusColor = chalk.green;
                        break;
                      case 'in_progress':
                      case 'in-progress':
                        statusIcon = '🔄';
                        statusColor = chalk.yellow;
                        break;
                      case 'pending':
                      default:
                        statusIcon = '⏳';
                        statusColor = chalk.gray;
                        break;
                    }
                    
                    const taskNumber = `${index + 1}.`.padEnd(3);
                    console.log(`   ${statusColor(statusIcon)} ${taskNumber}${statusColor(todo.content || 'Unknown task')}`);
                  });
                  console.log(''); // Add spacing
                }
              } catch (e) {
                // Fallback to regular tool display
                console.log(`\n${chalk.cyan(`🔧 ${toolName}`)}`);
                const inputStr = typeof data.input === 'string'
                  ? data.input
                  : JSON.stringify(data.input, null, 2);
                if (inputStr.length < 200) {
                  console.log(chalk.gray(`   Input: ${inputStr}`));
                }
              }
            }
          } else {
            // Regular tool display
            console.log(`\n${chalk.cyan(`🔧 ${toolName}`)}`);
            
            // Show tool input
            if (data.input) {
              const inputStr = typeof data.input === 'string'
                ? data.input
                : JSON.stringify(data.input, null, 2);
              if (inputStr.length < 200) {
                console.log(chalk.gray(`   Input: ${inputStr}`));
              } else {
                console.log(chalk.gray(`   Input: ${inputStr.substring(0, 200)}...`));
              }
            }
          }
        }
        
        else if (event === "on_tool_end") {
          const toolName = data.name || name || 'tool';
          
          // Special handling for TODO tools - simplified completion
          if (toolName.includes('todos') || toolName.includes('todo')) {
            console.log(chalk.green(`✅ Task list updated successfully\n`));
          } else {
            // Regular tool completion
            console.log(chalk.green(`✅ ${toolName} completed`));
            
            // Show result if available and short
            if (data.output && typeof data.output === 'string' && data.output.length < 200) {
              console.log(chalk.dim(`   Result: ${data.output}`));
            } else if (data.output) {
              console.log(chalk.dim('   Result: [Output available]'));
            }
          }
          
          isProcessingTool = false;
        }

        // Handle other events for debugging if needed
        else if (event === "on_chain_start" && name === "agent") {
          // Agent started - could show progress here
        }
        else if (event === "on_chain_end" && name === "agent") {
          // Agent completed
          if (data.output && data.output.messages) {
            const lastMessage = data.output.messages[data.output.messages.length - 1];
            if (lastMessage && lastMessage.content && typeof lastMessage.content === 'string') {
              fullContent += lastMessage.content;
            }
          }
        }
      }

      // Add any remaining buffered content
      fullContent += messageContentBuffer;

      // If spinner was never stopped (no content streamed), stop it now
      if (!spinnerStopped && globalStreamingHandler) {
        globalStreamingHandler.stop();
      }

      if (hasStartedStreaming && fullContent.trim()) {
        process.stdout.write('\n');
      }

    } catch (error) {
      console.error(chalk.red('Error in proper LangGraph streaming:'), error);
      
      // Fallback to simple stream approach
      try {
        const simpleStream = await this.agent.stream(
          input,
          { ...runConfig, streamMode: "messages" }
        );

        for await (const [message] of simpleStream) {
          clearSpinner();
          if (isAIMessageChunk(message) && message.content) {
            // Handle content with proper type checking
            let contentText = '';
            if (typeof message.content === 'string') {
              contentText = message.content;
            } else if (Array.isArray(message.content)) {
              contentText = message.content
                .map((part: any) => {
                  if (typeof part === 'string') {
                    return part;
                  } else if (part && typeof part === 'object' && 'text' in part) {
                    return part.text || '';
                  }
                  return '';
                })
                .join('');
            }
            
            if (contentText) {
              process.stdout.write(contentText);
              fullContent += contentText;
            }
            
            if (message.usage_metadata) {
              usage.input_tokens += message.usage_metadata.input_tokens || 0;
              usage.output_tokens += message.usage_metadata.output_tokens || 0;
            }
          }
        }
      } catch (fallbackError) {
        console.error(chalk.red('Fallback streaming also failed:'), fallbackError);
      }
      
      // Make sure spinner is stopped even on error
      if (globalStreamingHandler) {
        globalStreamingHandler.stop();
      }
    }

    return { content: fullContent, toolUses, usage };
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
    //await this.tokenOptimizer.initialize();
    
    // Initialize validation engine
    await this.validationEngine.initialize();
  }



  /**
   * Build clean system prompt for Deep Agents with caching support (no project context)
   */
  private buildCleanSystemPrompt(): string {
    // Return only the base system prompt - no project context mixed in
    let prompt = this.config.systemPrompt;
    
    if (this.customRules && this.customRules.trim()) {
      prompt += `\n\n## Custom Project Rules:\n${this.customRules}`;
    }
    
    // Add cache control marker for 90% cost savings on repeated system prompts
    // This tells Anthropic to cache this content for 5 minutes
    prompt += '\n\n<!-- CACHE_CONTROL_EPHEMERAL -->';
    
    return prompt;
  }

  /**
   * Load sub-agents from markdown files
   */
  private async loadSubAgents(): Promise<any[]> {
    try {
      // Initialize sub-agents directory if needed
      await this.subAgentLoader.initializeSubAgents();
      
      // Load all sub-agents from .openagent/agents/
      const subAgentConfigs = await this.subAgentLoader.loadSubAgents();
      
      // Convert to Deep Agents format
      return subAgentConfigs.map(config => ({
        name: config.name,
        description: config.description,
        prompt: config.prompt,
        tools: config.tools // Optional - inherits all if undefined
      }));
    } catch (error) {
      console.warn('Warning: Failed to load sub-agents:', error);
      return []; // Return empty array if loading fails
    }
  }

  /**
   * Get project context for user message (separate from system prompt)
   */
  private async getProjectContext(): Promise<string> {
    let context = '';
    
    // Add OPENAGENT.MD project context
    try {
      const projectContext = await this.openAgentContext.getProjectContext();
      if (projectContext && projectContext.trim()) {
        context += `## Project Context (OPENAGENT.MD):\n${projectContext}\n\n`;
      }
    } catch (error) {
      console.warn('Warning: OpenAgent context loading failed:', error);
    }
    
    // Add session context summary
    try {
      const contextSummary = this.contextManager.getContextSummary();
      if (contextSummary && contextSummary.trim()) {
        context += `## Session Context:\n${contextSummary}\n\n`;
      }
    } catch (error) {
      console.warn('Warning: Context summary failed:', error);
    }
    
    return context;
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
  // private displayCost(usage: { input_tokens: number; output_tokens: number }): void {
  //   const costs = this.tokenCounter.calculateCost(
  //     "claude-sonnet-4-20250514",
  //     usage.input_tokens,
  //     usage.output_tokens
  //   );
  //   console.log(chalk.cyan(`\n💰 Cost: ${costs.formattedCost} (${usage.input_tokens} + ${usage.output_tokens} tokens)`));
    
    
  // }

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

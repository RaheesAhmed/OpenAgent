import Anthropic from '@anthropic-ai/sdk';
import chalk from 'chalk';
import { AgentConfig, AgentResponse, AgentContext } from '../types/agent.js';
import { OPENCLAUDE_SYSTEM_PROMPT } from "../prompts/openclaude_prompt.js";
import { TokenCounter } from '../core/tokens/TokenCounter.js';
import { ContextManager } from '../core/context/ContextManager.js';
import { TokenOptimizer } from '../core/optimization/TokenOptimizer.js';
import { ValidationEngine } from '../core/validation/ValidationEngine.js';
import { allToolDefinitions } from '../tools/index.js';
import { executeCustomTool } from '../tools/executor.js';
import { MemoryIntegration } from '../memory/index.js';


/**
 * Main OpenClaude Agent 
 */
export class MainAgent {
  private anthropic: Anthropic;
  private config: AgentConfig;
  private tokenCounter: TokenCounter;
  private contextManager: ContextManager;
  private tokenOptimizer: TokenOptimizer;
  private validationEngine: ValidationEngine;
  private mcpServers: any[];
  private customRules: string;
  private memory: MemoryIntegration;
  private context: AgentContext;
  private debugMode: boolean = false; // Add debug mode flag

  constructor(apiKey: string, context: AgentContext, mcpServers: any[] = [], customRules: string = '') {
    this.anthropic = new Anthropic({ apiKey });
    this.tokenCounter = new TokenCounter(apiKey);
    this.mcpServers = mcpServers;
    this.customRules = customRules;
    this.context = context;
    this.debugMode = process.env['DEBUG_OPENCLAUDE'] === 'true' || false; // Enable debug via env var
    
    // Initialize advanced systems
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
    
    // Initialize memory system
    this.memory = new MemoryIntegration(context.projectPath, context.session.id);
    
    this.config = {
      id: "openclaude-main",
      name: "OpenClaude",
      description:
        "Advanced AI development assistant that handles all coding tasks",
      model: "claude-sonnet-4-20250514",
      systemPrompt: this.buildSystemPrompt(),
      tools: this.getAvailableTools(),
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
      ],
      maxTokens: 4096,
      temperature: 0.1,
      metadata: {
        category: "development",
        tags: ["main", "unified", "development"],
        author: "OpenClaude",
        version: "1.0.0",
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
   * Process user message with streaming response and tool handling
   */
  public async processMessage(message: string): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      // Initialize systems if not done yet
      await this.ensureSystemsInitialized();

      // Update conversation context with user message
      await this.contextManager.updateConversation('user', message);
      await this.contextManager.updateUser(message, [], {});

      // Get contextual memories to enhance response
      const memoryContext = await this.memory.getContextualMemories(message, this.context);
      
      // Build enhanced message with memory context and context summary
      let userContent = message;
      if (memoryContext.trim()) {
        userContent += '\n\n' + memoryContext;
      }
      
      // Add context summary for better continuity
      const contextSummary = this.contextManager.getContextSummary();
      if (contextSummary.trim()) {
        userContent += '\n\n' + contextSummary;
      }

      // Optimize the content for token efficiency
      let optimizationResult;
      try {
        optimizationResult = await this.tokenOptimizer.optimizeRequest(
          userContent,
          { 
            conversation: true,
            projectContext: this.contextManager.getCurrentState()?.project,
            previousMessages: this.contextManager.getCurrentState()?.conversation.messages.slice(-5)
          },
          this.config.model
        );
      } catch (optimizerError) {
        // Create a fallback optimization result if optimizer fails
        optimizationResult = {
          optimizedContent: userContent,
          originalTokens: Math.ceil(userContent.length / 4),
          optimizedTokens: Math.ceil(userContent.length / 4),
          savings: {
            savedTokens: 0,
            compressionRatio: 1.0,
            costSavings: 0,
            optimizationTime: 0
          },
          cacheHits: []
        };
      }

      // Use optimized content
      userContent = optimizationResult.optimizedContent;
      
      // Display optimization savings
      if (optimizationResult.savings.savedTokens > 0) {
        //console.log(chalk.green(`🔧 Token optimization: Saved ${optimizationResult.savings.savedTokens} tokens (${(optimizationResult.savings.compressionRatio * 100).toFixed(1)}% compression)`));
      }

      let messages: Array<any> = [
        { role: 'user' as const, content: userContent }
      ];

      // Keep processing until Claude stops using tools
      let finalResponse = '';
      let totalUsage = { input_tokens: 0, output_tokens: 0 };
      let loopCount = 0;
      const maxLoops = 10; // Prevent infinite loops
      
      while (loopCount < maxLoops) {
        loopCount++;
        
        // Use streaming for real-time response
        const streamOptions: any = {
          model: this.config.model,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          system: this.config.systemPrompt,
          messages: messages,
          tools: this.config.tools,
          stream: true
        };
        
        // Add MCP servers if configured
        if (this.mcpServers && this.mcpServers.length > 0) {
          streamOptions.mcp_servers = this.mcpServers;
        }
        
        // Add headers for MCP and fine-grained streaming
        const headers: any = {};
        if (this.mcpServers && this.mcpServers.length > 0) {
          headers['anthropic-beta'] = 'mcp-client-2025-04-04,fine-grained-tool-streaming-2025-05-14';
        } else {
          headers['anthropic-beta'] = 'fine-grained-tool-streaming-2025-05-14';
        }
        
        const stream = await this.anthropic.messages.stream(
          streamOptions,
          { headers }
        );

        const response = await this.handleStreamResponse(stream, startTime);
        finalResponse += response.content;
        
        // Accumulate token usage
        totalUsage.input_tokens += response.metadata.tokensUsed.input;
        totalUsage.output_tokens += response.metadata.tokensUsed.output;
        
        // Check if Claude used any tools that need execution
        if (response.toolUses && response.toolUses.length > 0) {
          // Execute tools and add results to conversation
          const toolResults = await this.executeTools(response.toolUses);
          
          // Add Claude's response with tool uses to conversation
          const assistantContent = [];
          
          // Add text content if any
          if (response.content && response.content.trim()) {
            assistantContent.push({
              type: 'text' as const,
              text: response.content
            });
          }
          
          // Add tool uses
          for (const toolUse of response.toolUses) {
            assistantContent.push({
              type: 'tool_use' as const,
              id: toolUse.id,
              name: toolUse.name,
              input: toolUse.input
            });
          }
          
          messages.push({
            role: 'assistant' as const,
            content: assistantContent
          });
          
          // Add tool results as properly formatted user message
          const parsedResults = JSON.parse(toolResults);
          const toolResultContent = parsedResults.map((result: any) => ({
            type: 'tool_result' as const,
            tool_use_id: result.tool_use_id,
            content: result.content
          }));
          
          messages.push({
            role: 'user' as const,
            content: toolResultContent
          });
          
          // Continue the conversation - Claude should provide a follow-up response
          continue;
        } else {
          // No more tools to execute, we're done
          break;
        }
      }
      
      if (loopCount >= maxLoops) {
        finalResponse += '\n\n[System: Maximum execution loops reached. Task may be incomplete.]';
      }
      
      // Display cost for the complete interaction
      this.displayCost(totalUsage, this.config.model);
      
      const response: AgentResponse = {
        success: true,
        content: finalResponse,
        toolUses: [],
        metadata: {
          modelUsed: this.config.model,
          tokensUsed: {
            input: totalUsage.input_tokens,
            output: totalUsage.output_tokens,
            cached: 0
          },
          responseTime: Date.now() - startTime,
          confidence: 0.9
        }
      };

      // Learn from this interaction
      try {
        await this.memory.learnFromInteraction({
          userMessage: message,
          response: finalResponse,
          success: true,
          toolsUsed: this.extractToolNamesFromMessages(messages),
          duration: response.metadata.responseTime,
          context: {
            tokensUsed: response.metadata.tokensUsed,
            model: response.metadata.modelUsed,
            confidence: response.metadata.confidence
          }
        });
      } catch (memoryError) {
        console.warn('Warning: Failed to store interaction in memory:', memoryError);
      }

      // Update context with assistant response
      await this.contextManager.updateConversation('assistant', finalResponse);
      await this.contextManager.updateAI(
        this.config.model,
        response.metadata.confidence,
        [`Generated response with ${response.content.length} characters`],
        this.extractToolNamesFromMessages(messages)
      );

      // Track token usage with optimizer
      await this.tokenOptimizer.trackUsage(
        totalUsage.input_tokens,
        totalUsage.output_tokens,
        this.config.model,
        optimizationResult.cacheHits.length > 0 ? optimizationResult.savings.savedTokens : 0
      );

      // Validate any generated code
      await this.validateGeneratedCode(finalResponse);

      return response;
    } catch (error) {
      return this.createErrorResponse(error as Error, startTime);
    }
  }

  /**
   * Ensure all systems are properly initialized
   */
  private async ensureSystemsInitialized(): Promise<void> {
    try {
      // Initialize context manager with session
      await this.contextManager.initialize(this.context.session.id);
      
      // Initialize token optimizer
      await this.tokenOptimizer.initialize();
      
      // Initialize validation engine
      await this.validationEngine.initialize();
      
    } catch (error) {
      console.warn('Warning: Failed to initialize some systems:', error);
    }
  }

  /**
   * Validate any code generated in the response
   */
  private async validateGeneratedCode(response: string): Promise<void> {
    try {
      // Extract code blocks from response
      const codeBlocks = this.extractCodeBlocks(response);
      
      for (const block of codeBlocks) {
        const validation = await this.validationEngine.validateCode(
          block.code,
          block.language,
          {
            projectStructure: this.contextManager.getCurrentState()?.project.structure,
            dependencies: Object.keys(this.contextManager.getCurrentState()?.project.dependencies || {})
          }
        );
        
        if (!validation.overall.passed) {
          console.log(chalk.yellow(`⚠️  Code quality warning (${(validation.overall.score * 100).toFixed(0)}% quality score)`));
          
          // Show critical issues
          const criticalIssues = validation.recommendations.filter(r => r.priority === 'critical');
          if (criticalIssues.length > 0) {
            console.log(chalk.red(`   Critical issues found: ${criticalIssues.length}`));
            for (const issue of criticalIssues.slice(0, 3)) {
              console.log(chalk.dim(`   • ${issue.title}`));
            }
          }
        } else {
          console.log(chalk.green(`✅ Code validation passed (${(validation.overall.score * 100).toFixed(0)}% quality score)`));
        }
      }
    } catch (error) {
      console.warn('Warning: Code validation failed:', error);
    }
  }

  /**
   * Extract code blocks from response text
   */
  private extractCodeBlocks(text: string): Array<{code: string; language: string}> {
    const blocks: Array<{code: string; language: string}> = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
    
    let match;
    while ((match = codeBlockRegex.exec(text)) !== null) {
      const language = match[1] || 'text';
      const code = match[2] || '';
      
      if (code.trim() && ['javascript', 'typescript', 'python', 'java', 'json'].includes(language.toLowerCase())) {
        blocks.push({ code, language: language.toLowerCase() });
      }
    }
    
    return blocks;
  }

  /**
   * Handle streaming response from Claude API
   */
  private async handleStreamResponse(stream: any, startTime: number): Promise<AgentResponse> {
    let fullContent = '';
    const toolUses: any[] = [];
    let usage = { input_tokens: 0, output_tokens: 0 };
    let hasStartedStreaming = false;
    let isStreamingText = false;
    
    // Track content blocks by index for proper tool input handling
    const contentBlocks = new Map<number, any>();

    try {
      // Get global streaming handler if available
      const { globalStreamingHandler } = await import('../cli/index.js').catch(() => ({ globalStreamingHandler: null }));

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            // Stop spinner when we start streaming text for the first time
            if (!hasStartedStreaming && globalStreamingHandler) {
              globalStreamingHandler.stop(); // Just stop, don't show completion message yet
              hasStartedStreaming = true;
            }
            
            isStreamingText = true;
            // Stream text content in real-time
            process.stdout.write(event.delta.text);
            fullContent += event.delta.text;
          } else if (event.delta.type === 'input_json_delta') {
            // Handle tool input streaming - accumulate and display tool parameters in real-time
            const blockIndex = event.index;
            if (contentBlocks.has(blockIndex)) {
              const block = contentBlocks.get(blockIndex);
              if (!block.inputJson) {
                block.inputJson = '';
              }
              block.inputJson += event.delta.partial_json;
              
              // Show real-time streaming of tool parameters
              process.stdout.write(chalk.cyan(event.delta.partial_json));
            }
          }
        } else if (event.type === 'content_block_start') {
          const blockIndex = event.index;
          
          if (this.debugMode) {
            console.log(`\n[DEBUG] Content block ${blockIndex} started:`, event.content_block.type, event.content_block.name);
            if (event.content_block.input) {
              console.log('[DEBUG] Initial input:', JSON.stringify(event.content_block.input, null, 2));
            }
          }
          
          if (event.content_block.type === 'tool_use') {
            // When a tool starts, if we were streaming text, add a line break
            if (isStreamingText) {
              process.stdout.write('\n');
              isStreamingText = false;
            }
            
            // Custom tools - show status
            const toolName = event.content_block.name;
            if (globalStreamingHandler) {
              switch (toolName) {
                case 'read_file':
                  globalStreamingHandler.start('Reading file');
                  break;
                case 'create_file':
                  globalStreamingHandler.start('Creating file');
                  break;
                case 'search_replace':
                  globalStreamingHandler.start('Editing file');
                  break;
                case 'delete_file':
                  globalStreamingHandler.start('Deleting file');
                  break;
                case 'list_directory':
                  globalStreamingHandler.start('Listing directory');
                  break;
                case 'terminal':
                  globalStreamingHandler.start('Running command');
                  break;
                default:
                  globalStreamingHandler.start(`Using tool: ${toolName}`);
              }
            }
            
            const toolUse = {
              id: event.content_block.id,
              name: event.content_block.name,
              input: event.content_block.input ? { ...event.content_block.input } : {}, // Deep copy initial input from content_block_start
              inputJson: '', // Will be populated by streaming deltas
              output: null,
              error: null,
              duration: 0
            };
            
            toolUses.push(toolUse);
            contentBlocks.set(blockIndex, toolUse);
          } else if (event.content_block.type === 'text') {
            // New text block starting - if we have a spinner running, stop it
            if (globalStreamingHandler && globalStreamingHandler.isRunning()) {
              globalStreamingHandler.complete('Done');
            }
          } else if (event.content_block.type === 'server_tool_use') {
            // Server-side tools (web search) - handled automatically by Claude
            if (event.content_block.name === 'web_search') {
              if (globalStreamingHandler) {
                globalStreamingHandler.start('Searching the web');
              }
            }
          } else if (event.content_block.type === 'web_search_tool_result') {
            // Web search results received
            const results = event.content_block.content;
            if (Array.isArray(results) && results.length > 0) {
              if (globalStreamingHandler) {
                globalStreamingHandler.complete(`Found ${results.length} search results`);
              }
              // Show clean web search result info
              console.log(chalk.green(`\n🔍 Web Search Results:`));
              results.slice(0, 3).forEach((result: any, index: number) => {
                if (result.url && result.title) {
                  console.log(chalk.dim(`   ${index + 1}. ${result.title}`));
                  console.log(chalk.dim(`      ${result.url}`));
                }
              });
              if (results.length > 3) {
                console.log(chalk.dim(`   ... and ${results.length - 3} more results`));
              }
            }
          }
        } else if (event.type === 'content_block_stop') {
          const blockIndex = event.index;
          
          if (this.debugMode) {
            console.log(`\n[DEBUG] Content block ${blockIndex} stopped`);
            if (contentBlocks.has(blockIndex)) {
              const block = contentBlocks.get(blockIndex);
              console.log('[DEBUG] Block data:', {
                name: block.name,
                hasInputJson: !!block.inputJson,
                inputJsonLength: block.inputJson ? block.inputJson.length : 0,
                initialInput: block.input
              });
            }
          }
          
          // Parse accumulated JSON for tool use blocks when they complete
          if (contentBlocks.has(blockIndex)) {
            const block = contentBlocks.get(blockIndex);
            if (block && block.inputJson) {
              try {
                // Attempt to parse the accumulated JSON
                let parsedInput;
                try {
                  parsedInput = JSON.parse(block.inputJson);
                } catch (jsonError) {
                  // Handle incomplete JSON due to fine-grained streaming or max_tokens limit
                  console.warn(`\n⚠️  JSON parsing failed for ${block.name}, attempting to fix incomplete JSON...`);
                  
                  // Try to fix common incomplete JSON issues
                  let fixedJson = block.inputJson.trim();
                  
                  // If it ends with a comma, remove it
                  if (fixedJson.endsWith(',')) {
                    fixedJson = fixedJson.slice(0, -1);
                  }
                  
                  // Try to close any unclosed braces or brackets
                  const openBraces = (fixedJson.match(/\{/g) || []).length;
                  const closeBraces = (fixedJson.match(/\}/g) || []).length;
                  const openBrackets = (fixedJson.match(/\[/g) || []).length;
                  const closeBrackets = (fixedJson.match(/\]/g) || []).length;
                  
                  // Add missing closing brackets
                  for (let i = 0; i < openBrackets - closeBrackets; i++) {
                    fixedJson += ']';
                  }
                  
                  // Add missing closing braces
                  for (let i = 0; i < openBraces - closeBraces; i++) {
                    fixedJson += '}';
                  }
                  
                  try {
                    parsedInput = JSON.parse(fixedJson);
                    console.log(`✅ Successfully fixed incomplete JSON for ${block.name}`);
                  } catch (secondError) {
                    // If we still can't parse it, wrap it as invalid JSON as per documentation
                    console.error(`❌ Could not fix JSON for ${block.name}, wrapping as invalid`);
                    throw new Error(`Invalid JSON received: ${block.inputJson}`);
                  }
                }
                
                // Skip validation - parameters are handled by the tools themselves
                
                // Merge parsed JSON with existing input
                block.input = { ...block.input, ...parsedInput };
                // Clean up the temporary inputJson
                delete block.inputJson;
              } catch (e) {
                console.error(`\n❌ Tool parameter error for ${block.name}:`, e instanceof Error ? e.message : String(e));
                console.error(`   Raw JSON: ${block.inputJson}`);
                // Keep the inputJson for debugging but mark it as invalid
                block.inputJsonError = e instanceof Error ? e.message : String(e);
                
                // For invalid JSON, wrap it as per documentation recommendation
                if (block.inputJson && typeof block.inputJson === 'string') {
                  block.input = {
                    INVALID_JSON: block.inputJson.replace(/"/g, '\\"') // Escape quotes
                  };
                }
              }
            } else if (block && (!block.input || Object.keys(block.input).length === 0)) {
              // No streamed JSON parameters and no initial input, this is an error
              console.error(`\n⚠️  No parameters received for ${block.name}`);
              block.inputJsonError = 'No parameters received from streaming or initial input';
            } else if (block && !block.inputJson) {
              // No streamed JSON parameters, but we have initial input from content_block_start
              console.log(`\n✅ Using initial parameters for ${block.name}`);
            }
          }
          
          // When a tool block stops, complete the spinner if it's running
          if (globalStreamingHandler && globalStreamingHandler.isRunning()) {
            globalStreamingHandler.complete('Done');
          }
        } else if (event.type === 'message_delta') {
          if (event.usage) {
            usage = event.usage;
          }
        }
      }

      // Final cleanup - stop any remaining spinner
      if (globalStreamingHandler && globalStreamingHandler.isRunning()) {
        globalStreamingHandler.stop();
      }

      return {
        success: true,
        content: fullContent,
        toolUses,
        metadata: {
          modelUsed: this.config.model,
          tokensUsed: {
            input: usage.input_tokens || 0,
            output: usage.output_tokens || 0,
            cached: 0
          },
          responseTime: Date.now() - startTime,
          confidence: 0.9
        }
      };
    } catch (error) {
      return this.createErrorResponse(error as Error, startTime);
    }
  }

 

  /**
   * Execute tools and return results
   */
  private async executeTools(toolUses: any[]): Promise<string> {
    const toolResults = [];
    
    for (const toolUse of toolUses) {
      try {
        // Display clean tool usage information like Claude Code
        this.displayToolUsage(toolUse);
        
        let result = '';
        let input = toolUse.input || {};
        
        // Check for any JSON parsing errors from streaming
        if (toolUse.inputJsonError) {
          result = `Error: Failed to parse tool parameters - ${toolUse.inputJsonError}`;
          console.log(chalk.red(`✗ ${toolUse.name} failed: Parameter parsing error`));
        } else {
          // Add debug logging for parameters being passed to tools
          console.log(chalk.cyan(`[DEBUG] Executing ${toolUse.name} with parameters:`));
          console.log(chalk.dim(JSON.stringify(input, null, 2)));
          
          // Execute custom tool directly without validation
          const toolResult = await executeCustomTool(toolUse.name, input);
          
          if (toolResult.success) {
            result = toolResult.content;
            // Show successful tool completion
            this.displayToolResult(toolUse.name, result);
          } else {
            result = toolResult.error || 'Unknown tool error';
            console.log(chalk.red(`✗ ${toolUse.name} failed: ${result}`));
          }
        }
        
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(chalk.red(`✗ ${toolUse.name} error: ${errorMessage}`));
        
        toolResults.push({
          type: 'tool_result', 
          tool_use_id: toolUse.id,
          content: `Error: ${errorMessage}`,
          is_error: true
        });
      }
    }
    
    return JSON.stringify(toolResults, null, 2);
  }

  /**
   * Display clean tool usage information
   */
  private displayToolUsage(toolUse: any): void {
    const toolName = toolUse.name;
    const input = toolUse.input || {};
    
    // Format tool usage display like Claude Code
    switch (toolName) {
      case 'read_file':
        console.log(chalk.blue(`\n📖 Reading ${input.path || 'file'}`));
        break;
      case 'create_file':
        console.log(chalk.green(`\n📝 Creating ${input.path || 'file'}`));
        break;
      case 'search_replace':
        console.log(chalk.yellow(`\n✏️  Editing ${input.path || 'file'}`));
        break;
      case 'delete_file':
        console.log(chalk.red(`\n🗑️  Deleting ${input.path || 'file'}`));
        break;
      case 'list_directory':
        console.log(chalk.cyan(`\n📁 Listing ${input.path || 'directory'}`));
        break;
      case 'terminal':
        console.log(chalk.magenta(`\n💻 Running: ${input.command || 'command'}`));
        break;
      case 'web_search':
        console.log(chalk.green(`\n🔍 Searching: ${input.query || 'web search'}`));
        break;
      default:
        console.log(chalk.gray(`\n🔧 Using ${toolName}`));
        if (Object.keys(input).length > 0) {
          const params = Object.entries(input)
            .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
            .join(', ');
          console.log(chalk.dim(`   ${params}`));
        }
    }
  }

  /**
   * Display tool result in a clean format
   */
  private displayToolResult(toolName: string, result: string): void {
    switch (toolName) {
      case 'read_file':
        const lines = result.split('\n').length;
        console.log(chalk.dim(`   └── Read ${lines} lines`));
        break;
      case 'create_file':
        console.log(chalk.dim(`   └── File created successfully`));
        break;
      case 'search_replace':
        console.log(chalk.dim(`   └── File updated successfully`));
        break;
      case 'delete_file':
        console.log(chalk.dim(`   └── File deleted successfully`));
        break;
      case 'list_directory':
        const items = result.split('\n').filter(line => line.trim()).length;
        console.log(chalk.dim(`   └── Found ${items} items`));
        break;
      case 'terminal':
        if (result.length > 200) {
          console.log(chalk.dim(`   └── Command executed (${result.length} chars output)`));
        } else if (result.trim()) {
          console.log(chalk.dim(`   └── ${result.trim()}`));
        } else {
          console.log(chalk.dim(`   └── Command completed`));
        }
        break;
      default:
        if (result.length > 100) {
          console.log(chalk.dim(`   └── Completed (${result.length} chars)`));
        } else {
          console.log(chalk.dim(`   └── ${result.substring(0, 100)}${result.length > 100 ? '...' : ''}`));
        }
    }
  }
  
  /**
   * Build system prompt with custom rules and MCP information
   */
  private buildSystemPrompt(): string {
    let prompt = OPENCLAUDE_SYSTEM_PROMPT;
    
    // Add custom rules if available
    if (this.customRules && this.customRules.trim()) {
      prompt += `\n\nPROJECT-SPECIFIC RULES AND GUIDELINES:\n${this.customRules}`;
    }
    
    // Add MCP server information if available
    if (this.mcpServers && this.mcpServers.length > 0) {
      prompt += `\n\nMCP SERVERS AVAILABLE:\nYou have access to additional tools from ${this.mcpServers.length} MCP server(s). These tools will be made available automatically when needed.`;
    }
    
    return prompt;
  }

  private getAvailableTools(): any[] {
    // Add built-in web search tool along with custom tools
    const webSearchTool = {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: 5, // Limit searches per request
      // Optional: Can add domain filtering or localization here
    };
    
    return [...allToolDefinitions, webSearchTool];
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
        confidence: 0
      }
    };
  }

  /**
   * Get agent configuration
   */
  public getConfig(): AgentConfig {
    return this.config;
  }

  /**
   * Update agent metrics
   */
  public updateMetrics(success: boolean, responseTime: number): void {
    this.config.metadata.usage.totalCalls++;
    if (success) {
      this.config.metadata.usage.successRate = 
        (this.config.metadata.usage.successRate * (this.config.metadata.usage.totalCalls - 1) + 100) / 
        this.config.metadata.usage.totalCalls;
    }
    this.config.metadata.usage.avgResponseTime = 
      (this.config.metadata.usage.avgResponseTime * (this.config.metadata.usage.totalCalls - 1) + responseTime) / 
      this.config.metadata.usage.totalCalls;
  }

 

  /**
   * Extract tool names from message history for memory learning
   */
  private extractToolNamesFromMessages(messages: any[]): string[] {
    const toolNames: string[] = [];
    
    for (const message of messages) {
      if (message.role === 'assistant' && Array.isArray(message.content)) {
        for (const content of message.content) {
          if (content.type === 'tool_use' && content.name) {
            toolNames.push(content.name);
          }
        }
      }
    }
    
    return toolNames;
  }

  /**
   * Display only the total cost
   */
  private displayCost(tokensUsed: { input_tokens: number; output_tokens: number } | { input: number; output: number; cached: number }, model: string): void {
    const inputTokens = 'input_tokens' in tokensUsed ? tokensUsed.input_tokens : tokensUsed.input;
    const outputTokens = 'output_tokens' in tokensUsed ? tokensUsed.output_tokens : tokensUsed.output;
    
    const costInfo = this.tokenCounter.calculateCost(model, inputTokens, outputTokens);
    
    if (costInfo.totalCost > 0) {
      console.log(chalk.hex('#00FF88')(`\n\nTotal cost: ${costInfo.formattedCost}`));
    }
  }
}

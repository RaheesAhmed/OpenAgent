import Anthropic from '@anthropic-ai/sdk';
import chalk from 'chalk';
import { AgentConfig, AgentResponse, AgentContext } from '../types/agent.js';
import { OPENCLAUDE_SYSTEM_PROMPT } from "../prompts/openclaude_prompt.js";
import { TokenCounter } from '../core/tokens/TokenCounter.js';
import { allToolDefinitions } from '../tools/index.js';
import { executeCustomTool } from '../tools/executor.js';


/**
 * Main OpenClaude Agent 
 */
export class MainAgent {
  private anthropic: Anthropic;
  private config: AgentConfig;
  private tokenCounter: TokenCounter;
  private mcpServers: any[];
  private customRules: string;

  constructor(apiKey: string, _context: AgentContext, mcpServers: any[] = [], customRules: string = '') {
    this.anthropic = new Anthropic({ apiKey });
    this.tokenCounter = new TokenCounter(apiKey);
    this.mcpServers = mcpServers;
    this.customRules = customRules;
    
    this.config = {
      id: "openclaude-main",
      name: "OpenClaude Assistant",
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
      let messages: Array<any> = [
        { role: 'user' as const, content: message }
      ];

      // Keep processing until Claude stops using tools
      let finalResponse = '';
      let totalUsage = { input_tokens: 0, output_tokens: 0 };
      let loopCount = 0;
      const maxLoops = 10; // Prevent infinite loops
      
      while (loopCount < maxLoops) {
        loopCount++;
        
        // Prepare the request with MCP servers if available
        const requestOptions: any = {
          model: this.config.model,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          system: this.config.systemPrompt,
          messages: messages,
          tools: this.config.tools
        };

        // Add MCP servers if configured
        if (this.mcpServers && this.mcpServers.length > 0) {
          requestOptions.mcp_servers = this.mcpServers;
        }

        // Use streaming for real-time response
        const stream = await this.anthropic.messages.stream(
          requestOptions,
          this.mcpServers && this.mcpServers.length > 0 ? {
            headers: { 'anthropic-beta': 'mcp-client-2025-04-04' }
          } : {}
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
      
      return {
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
    } catch (error) {
      return this.createErrorResponse(error as Error, startTime);
    }
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
            // Handle tool input streaming - accumulate tool parameters by content block index
            const blockIndex = event.index;
            if (contentBlocks.has(blockIndex)) {
              const block = contentBlocks.get(blockIndex);
              if (!block.inputJson) {
                block.inputJson = '';
              }
              block.inputJson += event.delta.partial_json;
            }
          }
        } else if (event.type === 'content_block_start') {
          const blockIndex = event.index;
          
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
              input: event.content_block.input || {},
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
          
          // Parse accumulated JSON for tool use blocks when they complete
          if (contentBlocks.has(blockIndex)) {
            const block = contentBlocks.get(blockIndex);
            if (block && block.inputJson) {
              try {
                const parsedInput = JSON.parse(block.inputJson);
                // Merge parsed JSON with existing input
                block.input = { ...block.input, ...parsedInput };
                // Clean up the temporary inputJson
                delete block.inputJson;
              } catch (e) {
                console.error(`[DEBUG] ❌ Failed to parse accumulated JSON for tool ${block.name}:`, e);
                console.error(`[DEBUG] Accumulated JSON was: ${block.inputJson}`);
                // Keep the inputJson for debugging but mark it as invalid
                block.inputJsonError = e instanceof Error ? e.message : String(e);
              }
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
        } else {
          // Execute custom tool
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

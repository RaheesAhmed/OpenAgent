import Anthropic from '@anthropic-ai/sdk';
import chalk from 'chalk';
import { AgentConfig, AgentResponse, AgentContext, Tool } from '../types/agent.js';
import { OPENCLAUDE_SYSTEM_PROMPT } from "../prompts/openclaude_prompt.js";
import { ToolManager } from '../core/tools/ToolManager.js';
import { TokenCounter } from '../core/tokens/TokenCounter.js';


/**
 * Main OpenClaude Agent 
 */
export class MainAgent {
  private anthropic: Anthropic;
  private config: AgentConfig;
  private toolManager: ToolManager;
  private tokenCounter: TokenCounter;

  constructor(apiKey: string, _context: AgentContext) {
    this.anthropic = new Anthropic({ apiKey });
    this.toolManager = ToolManager.getInstance();
    this.tokenCounter = new TokenCounter(apiKey);
    
    this.config = {
      id: "openclaude-main",
      name: "OpenClaude Assistant",
      description:
        "Advanced AI development assistant that handles all coding tasks",
      model: "claude-sonnet-4-20250514",
      systemPrompt: OPENCLAUDE_SYSTEM_PROMPT,
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
   * Process user message with streaming response
   */
  public async processMessage(message: string): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      const messages = [
        { role: 'user' as const, content: message }
      ];

      // Use streaming for real-time response
      const stream = await this.anthropic.messages.stream({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: this.config.systemPrompt,
        messages: messages,
        tools: this.config.tools
      });

      const response = await this.handleStreamResponse(stream, startTime);
      
      // Display only total cost at the end
      this.displayCost(response.metadata.tokensUsed, this.config.model);
      
      return response;
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

    try {
      // Get global streaming handler if available
      const { globalStreamingHandler } = await import('../cli/index.js').catch(() => ({ globalStreamingHandler: null }));

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            // Stop spinner when we start streaming text
            if (!hasStartedStreaming && globalStreamingHandler) {
              globalStreamingHandler.complete('Streaming response');
              hasStartedStreaming = true;
            }
            
            // Stream text content in real-time
            process.stdout.write(event.delta.text);
            fullContent += event.delta.text;
          } else if (event.delta.type === 'input_json_delta') {
            // Handle tool use streaming (including web search queries)
            // Tool input is streamed as partial JSON
          }
        } else if (event.type === 'content_block_start') {
          if (event.content_block.type === 'tool_use') {
            // Start of custom tool use block
            if (globalStreamingHandler) {
              globalStreamingHandler.updateStatus(`Using tool: ${event.content_block.name}`);
            }
            
            toolUses.push({
              id: event.content_block.id,
              name: event.content_block.name,
              input: {},
              output: null,
              error: null,
              duration: 0
            });
          } else if (event.content_block.type === 'server_tool_use') {
            // Server-side tool (like web search) - handled automatically by Claude
            if (globalStreamingHandler) {
              globalStreamingHandler.updateStatus('Searching the web');
            }
            console.log(chalk.hex('#666666')(`\n[Searching web...]`));
          } else if (event.content_block.type === 'web_search_tool_result') {
            // Web search results received
            const results = event.content_block.content;
            if (Array.isArray(results) && results.length > 0) {
              if (globalStreamingHandler) {
                globalStreamingHandler.showUpdate(`Found ${results.length} search results`, 'success');
              }
            }
          }
        } else if (event.type === 'message_delta') {
          if (event.usage) {
            usage = event.usage;
          }
        }
      }

      // Execute any tools that were used
      for (const toolUse of toolUses) {
        try {
          if (globalStreamingHandler) {
            globalStreamingHandler.updateStatus(`Executing tool: ${toolUse.name}`);
          }
          
          const toolResult = await this.toolManager.executeTool(toolUse.name, toolUse.input);
          toolUse.output = toolResult;
        } catch (error) {
          toolUse.error = error instanceof Error ? error.message : 'Unknown error';
        }
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
   * Get available tools for the agent including built-in web search
   */
  private getAvailableTools(): Tool[] {
    const customTools = this.toolManager.getAvailableTools();
    
    // Add built-in web search tool
    const webSearchTool: any = {
      type: 'web_search_20250305',
      name: 'web_search',
      max_uses: 5
    };
    
    return [...customTools, webSearchTool];
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
  private displayCost(tokensUsed: { input: number; output: number; cached: number }, model: string): void {
    const costInfo = this.tokenCounter.calculateCost(model, tokensUsed.input, tokensUsed.output);
    
    if (costInfo.totalCost > 0) {
      console.log(chalk.hex('#00FF88')(`\n\nTotal cost: ${costInfo.formattedCost}`));
    }
  }
}
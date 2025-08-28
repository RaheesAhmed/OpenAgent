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

  constructor(apiKey: string, _context: AgentContext) {
    this.anthropic = new Anthropic({ apiKey });
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
        console.log(`\n[DEBUG] ===========================================`);
        console.log(`[DEBUG] Starting loop ${loopCount + 1}/${maxLoops}`);
        console.log(`[DEBUG] Current conversation messages: ${messages.length}`);
        loopCount++;
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
        finalResponse += response.content;
        
        // Accumulate token usage
        totalUsage.input_tokens += response.metadata.tokensUsed.input;
        totalUsage.output_tokens += response.metadata.tokensUsed.output;
        
        // Check if Claude used any tools that need execution
        if (response.toolUses && response.toolUses.length > 0) {
          console.log(`\n[DEBUG] ✨ CLAUDE REQUESTED ${response.toolUses.length} TOOLS:`);
          for (let i = 0; i < response.toolUses.length; i++) {
            const tool = response.toolUses[i];
            if (tool) {
              console.log(`[DEBUG] Tool ${i + 1}: ${tool.name}`);
              console.log(`[DEBUG] Tool Input:`, JSON.stringify(tool.input, null, 2));
              if ((tool as any).inputJson) {
                console.log(`[DEBUG] Streamed JSON Input:`, (tool as any).inputJson);
              }
            }
          }
          
          // Execute tools and add results to conversation
          console.log(`\n[DEBUG] 🔧 EXECUTING TOOLS...`);
          const toolResults = await this.executeTools(response.toolUses);
          console.log(`[DEBUG] 📊 TOOL EXECUTION COMPLETED`);
          console.log(`[DEBUG] Tool Results (formatted):`);
          console.log(toolResults);
          
          // Add Claude's response with tool uses to conversation
          // Need to include both text content and tool_use content blocks
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
          // Parse the JSON and create proper content blocks
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
          
          console.log(`\n[DEBUG] 💬 CONVERSATION UPDATE:`);
          console.log(`[DEBUG] Total messages now: ${messages.length}`);
          console.log(`[DEBUG] Assistant message (Claude's response):`);
          console.log(JSON.stringify(messages[messages.length - 2], null, 2));
          console.log(`[DEBUG] User message (tool results):`);
          console.log(JSON.stringify(messages[messages.length - 1].content, null, 2));
          console.log(`[DEBUG] Continuing conversation to get Claude's follow-up response...`);
          
          // Continue the conversation - Claude should provide a follow-up response
          continue;
        } else {
          // No more tools to execute, we're done
          console.log(`\n[DEBUG] ✅ CONVERSATION COMPLETE - NO MORE TOOLS REQUESTED`);
          console.log(`[DEBUG] Final response length: ${finalResponse.length} characters`);
          console.log(`[DEBUG] Total loops used: ${loopCount}/${maxLoops}`);
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
            if (globalStreamingHandler) {
              globalStreamingHandler.start('Searching the web');
            }
          } else if (event.content_block.type === 'web_search_tool_result') {
            // Web search results received
            const results = event.content_block.content;
            if (Array.isArray(results) && results.length > 0) {
              if (globalStreamingHandler) {
                globalStreamingHandler.showUpdate(`Found ${results.length} search results`, 'success');
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
    
    for (let i = 0; i < toolUses.length; i++) {
      const toolUse = toolUses[i];
      try {
        console.log(`\n[DEBUG] 🛠️  EXECUTING TOOL ${i + 1}/${toolUses.length}: ${toolUse.name}`);
        console.log(`[DEBUG] Tool ID: ${toolUse.id}`);
        let result = '';
        
        // Tool input is already properly parsed in handleStreamResponse
        let input = toolUse.input || {};
        console.log(`[DEBUG] 📥 TOOL INPUT PROCESSING:`);
        console.log(`[DEBUG] Final input:`, JSON.stringify(input, null, 2));
        
        // Check for any JSON parsing errors from streaming
        if (toolUse.inputJsonError) {
          console.log(`[DEBUG] ❌ Tool had JSON parsing error: ${toolUse.inputJsonError}`);
          result = `Error: Failed to parse tool parameters - ${toolUse.inputJsonError}`;
        } else {
          // Execute custom tool
          console.log(`[DEBUG] 🚀 CALLING executeCustomTool`);
          console.log(`[DEBUG] Tool name: ${toolUse.name}`);
          console.log(`[DEBUG] Tool input:`, JSON.stringify(input, null, 2));
          
          const toolResult = await executeCustomTool(toolUse.name, input);
          
          console.log(`[DEBUG] 📋 TOOL EXECUTION RESULT:`);
          console.log(`[DEBUG] Success: ${toolResult.success}`);
          console.log(`[DEBUG] Content length: ${toolResult.content?.length || 0} chars`);
          console.log(`[DEBUG] Error: ${toolResult.error || 'None'}`);
          console.log(`[DEBUG] Full result:`, JSON.stringify(toolResult, null, 2));
          
          if (toolResult.success) {
            result = toolResult.content;
          } else {
            result = toolResult.error || 'Unknown tool error';
          }
        }
        
        const toolResultForClaude = {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result
        };
        
        console.log(`[DEBUG] 📤 ADDING TOOL RESULT TO CONVERSATION:`);
        console.log(JSON.stringify(toolResultForClaude, null, 2));
        
        toolResults.push(toolResultForClaude);
        
      } catch (error) {
        console.log(`[DEBUG] ❌ TOOL EXECUTION ERROR for ${toolUse.name}:`, error);
        const errorResult = {
          type: 'tool_result', 
          tool_use_id: toolUse.id,
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          is_error: true
        };
        console.log(`[DEBUG] Error result:`, JSON.stringify(errorResult, null, 2));
        toolResults.push(errorResult);
      }
    }
    
    const resultString = JSON.stringify(toolResults, null, 2);
    console.log(`\n[DEBUG] 🎯 FINAL TOOL RESULTS FOR CLAUDE:`);
    console.log(`[DEBUG] Number of results: ${toolResults.length}`);
    console.log(`[DEBUG] Results JSON length: ${resultString.length} characters`);
    console.log(`[DEBUG] Complete JSON:`);
    console.log(resultString);
    console.log(`[DEBUG] ===========================================\n`);
    return resultString;
  }
  
  private getAvailableTools(): any[] {
    return allToolDefinitions;
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

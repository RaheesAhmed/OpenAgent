#!/usr/bin/env node

import chalk from 'chalk';
import { 
  displayLogo, 
  createErrorMessage,
  BRAND_COLORS
} from './interface/logo.js';
import { clearScreen } from './interface/components.js';
import { StreamingHandler } from './interface/StreamingHandler.js';
import { AgentManager } from '../agents/AgentManager.js';

/**
 * OpenClaude CLI Application - Direct Chat Interface
 */

const agentManager = AgentManager.getInstance();

// Global streaming handler for agent feedback
export let globalStreamingHandler: StreamingHandler | null = null;

/**
 * Get API key from environment
 */
async function getApiKey(): Promise<string | null> {
  return process.env['ANTHROPIC_API_KEY'] || null;
}

/**
 * Start interactive chat session
 */
async function startInteractiveChat(): Promise<void> {
  const readline = await import('readline');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.hex(BRAND_COLORS.primary)('You: ')
  });

  console.log(chalk.hex(BRAND_COLORS.text)('Type your message and press Enter. Type "exit" to quit.\n'));
  
  rl.prompt();

  rl.on('line', async (input) => {
    const message = input.trim();
    
    if (message.toLowerCase() === 'exit') {
      console.log(chalk.hex(BRAND_COLORS.primary)('\nGoodbye! Happy coding!'));
      rl.close();
      return;
    }
    
    if (message) {
      const streamingHandler = new StreamingHandler();
      globalStreamingHandler = streamingHandler;
      
      try {
        // Start with professional spinner
        streamingHandler.start('OpenClaude is thinking');
        
        const response = await agentManager.processMessage(message);
        
        // Only show completion if the handler is still running
        // (if it was stopped by streaming, don't show completion message)
        if (streamingHandler.isRunning()) {
          streamingHandler.complete('Response complete');
        }
       
        // The response content was already streamed by the agent
        console.log();
        
        if (response.toolUses && response.toolUses.length > 0) {
          console.log(chalk.hex(BRAND_COLORS.muted)(`(Used ${response.toolUses.length} tools)`));
        }
        
      } catch (error) {
        streamingHandler.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        globalStreamingHandler = null;
      }
    }
    
    console.log(); // Empty line for readability
    rl.prompt();
  });

  rl.on('close', () => {
    process.exit(0);
  });
}

/**
 * Global error handling
 */
process.on('uncaughtException', (error) => {
  console.error(createErrorMessage(`Uncaught error: ${error.message}`));
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(createErrorMessage(`Unhandled rejection: ${reason}`));
  process.exit(1);
});

/**
 * Main execution - Start chat directly
 */
async function main(): Promise<void> {
  try {
    // Show logo only
    clearScreen();
    displayLogo();
    
    // Get API key
    const apiKey = await getApiKey();
    if (!apiKey) {
      console.error(createErrorMessage('API key required. Set ANTHROPIC_API_KEY environment variable.'));
      console.log(chalk.hex(BRAND_COLORS.text)('Example: export ANTHROPIC_API_KEY="your-key-here"'));
      process.exit(1);
    }
    
    // Initialize agent silently
    await agentManager.initialize(apiKey, process.cwd());
    
    // Start chat immediately without any headers
    await startInteractiveChat();
    
  } catch (error) {
    console.error(createErrorMessage(`Failed to start OpenClaude: ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  }
}

// Start the application directly
main().catch((error) => {
  console.error(createErrorMessage(`Critical error: ${error.message}`));
  process.exit(1);
});

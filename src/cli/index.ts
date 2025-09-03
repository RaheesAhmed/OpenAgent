#!/usr/bin/env node


/**
 * Copyright (c) 2025 OpenAgent Team
 * Licensed under the MIT License
 */
import chalk from 'chalk';
import { 
  displayLogo, 
  createErrorMessage,
  BRAND_COLORS
} from './interface/logo.js';
import { clearScreen } from './interface/components.js';


import { StreamingHandler } from './interface/StreamingHandler.js';
import { OpenAgentManager } from "../agents/OpenAgentManager.js";
import { SlashCommandHandler } from './commands/SlashCommandHandler.js';

/**
 * OpenAgent CLI Application - Direct Chat Interface
 */

const agentManager = OpenAgentManager.getInstance();

// Global streaming handler for agent feedback
export let globalStreamingHandler: StreamingHandler | null = null;

// Slash command handler
let slashCommandHandler: SlashCommandHandler | null = null;

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

  console.log(chalk.hex(BRAND_COLORS.text)('Type your message and press Enter. Type "exit" or "/exit" to quit.'));
  console.log(chalk.hex(BRAND_COLORS.muted)('💡 Use slash commands like /help, /status, /reset for quick actions.\n'));
  
  rl.prompt();

  rl.on('line', async (input) => {
    const message = input.trim();
    
    if (message.toLowerCase() === 'exit') {
      console.log(chalk.hex(BRAND_COLORS.primary)('\nGoodbye! Happy coding!'));
      rl.close();
      return;
    }
    
    if (message) {
      // Check if it's a slash command first
      if (slashCommandHandler && slashCommandHandler.isSlashCommand(message)) {
        try {
          await slashCommandHandler.executeCommand(message);
        } catch (error) {
          console.error(chalk.hex(BRAND_COLORS.error)(`❌ Command error: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      } else {
        // Process as normal chat message
        const streamingHandler = new StreamingHandler();
        globalStreamingHandler = streamingHandler;
        
        try {
          // Start with professional spinner
          streamingHandler.start('OpenAgent is thinking');
          
          const response = await agentManager.processMessage(message);
          
          // Only show completion if the handler is still running
          // (if it was stopped by streaming, don't show completion message)
          if (streamingHandler.isRunning()) {
            streamingHandler.complete('Response complete');
          }
         
          // The response content was already streamed by the agent
          console.log();
          
          if (response.toolUses && response.toolUses.length > 0) {
            console.log(chalk.dim(`\n(Used ${response.toolUses.length} tools)`));
          }
          
        } catch (error) {
          streamingHandler.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
          globalStreamingHandler = null;
        }
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
    
    // Initialize slash command handler
    slashCommandHandler = new SlashCommandHandler(agentManager);
    
    // Start chat immediately without any headers
    await startInteractiveChat();
    
  } catch (error) {
    console.error(createErrorMessage(`Failed to start OpenAgent: ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  }
}

// Start the application directly
main().catch((error) => {
  console.error(createErrorMessage(`Critical error: ${error.message}`));
  process.exit(1);
});

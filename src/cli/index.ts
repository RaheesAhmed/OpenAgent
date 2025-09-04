#!/usr/bin/env node

import chalk from 'chalk';
import { 
  displayLogo, 
  createErrorMessage,
  BRAND_COLORS,
  STATUS_ICONS,
} from './interface/logo.js';
import { 
  clearScreen,
  createDivider,
  displayInfoBox,
  styledPrompt
} from './interface/components.js';

import { StreamingHandler } from './interface/StreamingHandler.js';
import { OpenAgentManager } from "../agents/OpenAgentManager.js";
import { SlashCommandHandler } from './commands/SlashCommandHandler.js';

const agentManager = OpenAgentManager.getInstance();
export let globalStreamingHandler: StreamingHandler | null = null;
let slashCommandHandler: SlashCommandHandler | null = null;

async function getApiKey(): Promise<string | null> {
  return process.env['ANTHROPIC_API_KEY'] || null;
}

async function showWelcomeScreen(): Promise<void> {
  clearScreen();
  displayLogo();
  
  console.log(createDivider('═', BRAND_COLORS.primary));
  console.log(chalk.hex(BRAND_COLORS.accent).bold('   Ready to transform your development experience'));
  console.log(createDivider('═', BRAND_COLORS.primary));
  
  displayInfoBox(
    'Quick Start Guide',
    [
      'Start typing to chat with OpenAgent',
      'Use /help to see all available commands',
      'Type "exit" or Ctrl+C to quit',
      'OpenAgent remembers context across sessions'
    ],
    'info'
  );
}

function createStyledPrompt(): string {
  const timestamp = new Date().toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return chalk.hex(BRAND_COLORS.primary)('┌─') + 
         chalk.hex(BRAND_COLORS.muted)(`[${timestamp}]`) + 
         chalk.hex(BRAND_COLORS.primary)(' You\n└─➤ ');
}



async function startInteractiveChat(): Promise<void> {
  const readline = await import('readline');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: createStyledPrompt(),
    completer: (line: string) => {
      if (!slashCommandHandler || !line.startsWith('/')) {
        return [[], line];
      }
      
      const commands = slashCommandHandler.getCommands();
      const hits = commands
        .map(cmd => `/${cmd.name}`)
        .filter(cmd => cmd.startsWith(line));
      
      return [hits, line];
    }
  });

  await showWelcomeScreen();
  
  console.log(chalk.hex(BRAND_COLORS.text)('\n' + STATUS_ICONS.sparkles + ' OpenAgent is ready! Start by asking a question or typing a command.\n'));
  console.log(chalk.hex(BRAND_COLORS.muted)('💡 Tip: Type "/" and press Tab for command suggestions\n'));
  
  rl.prompt();

  rl.on('line', async (input) => {
    const message = input.trim();
    
    if (message.toLowerCase() === 'exit' || message === '/exit') {
      console.log('\n' + createDivider('━', BRAND_COLORS.accent));
      console.log(chalk.hex(BRAND_COLORS.accent).bold(`  ${STATUS_ICONS.sparkles} Thank you for using OpenAgent!`));
      console.log(chalk.hex(BRAND_COLORS.muted)('    Happy coding and see you next time!'));
      console.log(createDivider('━', BRAND_COLORS.accent) + '\n');
      rl.close();
      return;
    }
    
    if (message === '/') {
      // Show all available commands when user just types "/"
      if (slashCommandHandler) {
        console.log('\n' + chalk.hex(BRAND_COLORS.primary).bold('🚀 Available Commands:'));
        const commands = slashCommandHandler.getCommands()
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(0, 10); // Show first 10 commands
        
        commands.forEach(cmd => {
          const aliases = cmd.aliases ? chalk.hex(BRAND_COLORS.muted)(` (${cmd.aliases.map(a => `/${a}`).join(', ')})`) : '';
          console.log(`  ${chalk.hex(BRAND_COLORS.primary)(`/${cmd.name}`)}${aliases} - ${chalk.hex(BRAND_COLORS.text)(cmd.description)}`);
        });
        
        console.log(`\n${chalk.hex(BRAND_COLORS.muted)('💡 Type the full command or use Tab completion')}`);
      }
      
      console.log('\n' + createDivider('─', BRAND_COLORS.muted));
      rl.setPrompt(createStyledPrompt());
      rl.prompt();
      return;
    }
    
    if (message) {
      console.log();
      
      if (slashCommandHandler && slashCommandHandler.isSlashCommand(message)) {
        try {
          await slashCommandHandler.executeCommand(message);
        } catch (error) {
          console.error(chalk.hex(BRAND_COLORS.error)(`${STATUS_ICONS.error} Command error: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      } else {
        // Show loading animation while agent processes
        const streamingHandler = new StreamingHandler();
        globalStreamingHandler = streamingHandler;
        
        try {
          streamingHandler.start('🤖 OpenAgent is thinking', true);
          
          const response = await agentManager.processMessage(message);
          
          if (streamingHandler.isRunning()) {
            streamingHandler.stop();
          }
          
          if (!response.success) {
            console.error(chalk.hex(BRAND_COLORS.error)(`${STATUS_ICONS.error} ${response.content}`));
          }
        } catch (error) {
          streamingHandler.stopAndClear();
          console.error(chalk.hex(BRAND_COLORS.error)(`${STATUS_ICONS.error} Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
        } finally {
          globalStreamingHandler = null;
        }
      }
    }
    
    console.log('\n' + createDivider('─', BRAND_COLORS.muted));
    
    // Update prompt with fresh timestamp
    rl.setPrompt(createStyledPrompt());
    rl.prompt();
  });

  rl.on('close', () => {
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('\n\n' + createDivider('━', BRAND_COLORS.accent));
    console.log(chalk.hex(BRAND_COLORS.accent).bold(`  ${STATUS_ICONS.sparkles} Thank you for using OpenAgent!`));
    console.log(chalk.hex(BRAND_COLORS.muted)('    Happy coding and see you next time!'));
    console.log(createDivider('━', BRAND_COLORS.accent) + '\n');
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

async function main(): Promise<void> {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      clearScreen();
      displayLogo();
      
      displayInfoBox(
        'API Key Required',
        [
          'OpenAgent needs your Anthropic API key to function',
          'Set the ANTHROPIC_API_KEY environment variable',
          'Example: export ANTHROPIC_API_KEY="your-key-here"',
          'Get your API key from: https://console.anthropic.com'
        ],
        'error'
      );
      
      const shouldConfigure = await styledPrompt<boolean>({
        type: 'confirm',
        name: 'configure',
        message: 'Would you like to configure your API key now?',
        default: true
      });
      
      if (shouldConfigure) {
        console.log(chalk.hex(BRAND_COLORS.muted)('\n💡 Please set your API key and restart OpenAgent'));
      }
      
      process.exit(1);
    }
    
    console.log(chalk.hex(BRAND_COLORS.primary)(`${STATUS_ICONS.gear} Initializing OpenAgent...`));
    
    await agentManager.initialize(apiKey, process.cwd());
    slashCommandHandler = new SlashCommandHandler(agentManager);
    
    console.log(chalk.hex(BRAND_COLORS.success)(`${STATUS_ICONS.success} OpenAgent initialized successfully!`));
    
    await startInteractiveChat();
    
  } catch (error) {
    console.error('\n' + createErrorMessage(`Failed to start OpenAgent: ${error instanceof Error ? error.message : 'Unknown error'}`));
    
    displayInfoBox(
      'Startup Error',
      [
        'OpenAgent encountered an error during startup',
        'Please check your configuration and try again',
        'If the problem persists, check the GitHub issues'
      ],
      'error'
    );
    
    process.exit(1);
  }
}

// Start the application directly
main().catch((error) => {
  console.error(createErrorMessage(`Critical error: ${error.message}`));
  process.exit(1);
});

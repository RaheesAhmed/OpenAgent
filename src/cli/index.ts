#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { 
  displayLogo, 
  createWelcomeMessage, 
  createErrorMessage,
  BRAND_COLORS,
  STATUS_ICONS 
} from './interface/logo.js';
import { clearScreen, createSectionHeader } from './interface/components.js';


/**
 * OpenClaude CLI Application
 * Command-line interface for AI development assistant
 */

const program = new Command();

// Configuration constants
const VERSION = '1.0.0';
const DESCRIPTION = 'open-source AI Coding Campanion';

/**
 * Configure the main CLI program
 */
function configureProgram(): void {
  program
    .name('openclaude')
    .description(DESCRIPTION)
    .version(VERSION, '-v, --version', 'display version number')
    .helpOption('-h, --help', 'display help for command')
    .configureHelp({
      helpWidth: 100,
      sortSubcommands: true
    });

  // Custom help display with logo and branding
  program.configureOutput({
    writeOut: (str) => {
      if (str.includes('Usage:')) {
        clearScreen();
        displayLogo();
        console.log(createWelcomeMessage());
        console.log(createSectionHeader('Available Commands'));
      }
      process.stdout.write(str);
    },
    writeErr: (str) => {
      process.stderr.write(chalk.hex(BRAND_COLORS.error)(str));
    }
  });
}

/**
 * Add all CLI commands
 */
function addCommands(): void {
  // Initialize OpenClaude in current directory
  program
    .command('init')
    .description('Initialize OpenClaude in the current directory')
    .option('-f, --force', 'force initialization even if already initialized')
    .option('-q, --quiet', 'suppress output except errors')
    .action(async (_options) => {
      try {
        console.log(createSectionHeader('Initializing OpenClaude', 'Setting up your AI development environment...'));
        
        // Implementation: InitCommand.execute(options)
        console.log(chalk.hex(BRAND_COLORS.warning)(`${STATUS_ICONS.gear} Command implementation coming soon...`));
        
      } catch (error) {
        console.error(createErrorMessage(`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
        process.exit(1);
      }
    });

  // Start interactive chat session
  program
    .command('chat')
    .alias('c')
    .description('Start an interactive chat session with OpenClaude')
    .option('-a, --agent <name>', 'use a specific agent (e.g., frontend-developer, backend-developer)')
    .option('-m, --model <model>', 'specify Claude model to use')
    .option('-t, --temperature <number>', 'set response creativity (0.0-1.0)')
    .option('-s, --system <prompt>', 'custom system prompt')
    .action(async (_options) => {
      try {
        console.log(createSectionHeader('OpenClaude Chat', 'Starting interactive AI development session...'));
        
        // Implementation: ChatCommand.execute(options)
        console.log(chalk.hex(BRAND_COLORS.warning)(`${STATUS_ICONS.robot} Chat implementation coming soon...`));
        
      } catch (error) {
        console.error(createErrorMessage(`Chat session failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
        process.exit(1);
      }
    });

  // Agent management commands
  const agentCommand = program
    .command('agent')
    .alias('a')
    .description('Manage OpenClaude agents');

  agentCommand
    .command('list')
    .description('List all available agents')
    .option('-d, --detailed', 'show detailed agent information')
    .action(async (_options) => {
      console.log(createSectionHeader('Available Agents', 'Your AI development specialists'));
      
      // Implementation: AgentCommand.list(options)
      console.log(chalk.hex(BRAND_COLORS.warning)(`${STATUS_ICONS.brain} Agent management coming soon...`));
    });

  agentCommand
    .command('create <name>')
    .description('Create a new custom agent from template')
    .option('-t, --template <template>', 'agent template to use')
    .option('-d, --description <desc>', 'agent description')
    .action(async (_name, _options) => {
      console.log(createSectionHeader('Create Agent', `Creating new agent: ${_name}`));
      
      // Implementation: AgentCommand.create(name, options)
      console.log(chalk.hex(BRAND_COLORS.warning)(`${STATUS_ICONS.sparkles} Agent creation coming soon...`));
    });

  agentCommand
    .command('remove <name>')
    .description('Remove a custom agent')
    .option('-f, --force', 'force removal without confirmation')
    .action(async (_name, _options) => {
      console.log(createSectionHeader('Remove Agent', `Removing agent: ${_name}`));
      
      // Implementation: AgentCommand.remove(name, options)
      console.log(chalk.hex(BRAND_COLORS.warning)(`${STATUS_ICONS.warning} Agent removal coming soon...`));
    });

  // Configuration management
  program
    .command('config')
    .description('Manage OpenClaude configuration')
    .option('-s, --show', 'show current configuration')
    .option('-e, --edit', 'edit configuration interactively')
    .option('-r, --reset', 'reset to default configuration')
    .action(async (_options) => {
      console.log(createSectionHeader('Configuration', 'Manage your OpenClaude settings'));
      
      // Implementation: ConfigCommand.manage(options)
      console.log(chalk.hex(BRAND_COLORS.warning)(`${STATUS_ICONS.gear} Configuration management coming soon...`));
    });

  // Memory and learning management
  program
    .command('memory')
    .alias('mem')
    .description('Manage OpenClaude memory and learning')
    .option('-c, --clear', 'clear all memory')
    .option('-e, --export <file>', 'export memory to file')
    .option('-i, --import <file>', 'import memory from file')
    .option('-s, --stats', 'show memory statistics')
    .action(async (_options) => {
      console.log(createSectionHeader('Memory Management', 'Manage AI learning and context'));
      
      // Implementation: MemoryCommand.manage(options)
      console.log(chalk.hex(BRAND_COLORS.warning)(`${STATUS_ICONS.brain} Memory management coming soon...`));
    });

  // Project analysis and insights
  program
    .command('analyze')
    .description('Analyze current project and provide insights')
    .option('-d, --depth <level>', 'analysis depth (1-3)', '2')
    .option('-f, --format <format>', 'output format (json, markdown, console)', 'console')
    .option('-o, --output <file>', 'save analysis to file')
    .action(async (_options) => {
      console.log(createSectionHeader('Project Analysis', 'AI-powered codebase insights'));
      
      // Implementation: AnalyzeCommand.execute(options)
      console.log(chalk.hex(BRAND_COLORS.warning)(`${STATUS_ICONS.lightning} Project analysis coming soon...`));
    });

  // Update and maintenance
  program
    .command('update')
    .description('Update OpenClaude to the latest version')
    .option('-c, --check', 'check for updates without installing')
    .option('-f, --force', 'force update even if already latest')
    .action(async (_options) => {
      console.log(createSectionHeader('Update OpenClaude', 'Keeping your AI assistant up to date'));
      
      // Implementation: UpdateCommand.execute(options)
      console.log(chalk.hex(BRAND_COLORS.warning)(`${STATUS_ICONS.rocket} Update system coming soon...`));
    });

  // Diagnostics and troubleshooting
  program
    .command('doctor')
    .description('Run diagnostic checks and troubleshooting')
    .option('-f, --fix', 'attempt to fix detected issues')
    .option('-v, --verbose', 'verbose diagnostic output')
    .action(async (_options) => {
      console.log(createSectionHeader('System Diagnostics', 'Checking OpenClaude health'));
      
      // Implementation: DoctorCommand.execute(options)
      console.log(chalk.hex(BRAND_COLORS.warning)(`${STATUS_ICONS.gear} Diagnostics coming soon...`));
    });
}

/**
 * Global error handling configuration
 */
function setupErrorHandling(): void {
  // Handle unknown commands
  program.on('command:*', () => {
    console.error(createErrorMessage(`Unknown command: ${program.args.join(' ')}`));
    console.log(chalk.hex(BRAND_COLORS.muted)('Run "openclaude --help" to see available commands.'));
    process.exit(1);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error(createErrorMessage(`Unexpected error: ${error.message}`));
    console.error(chalk.hex(BRAND_COLORS.muted)('Please report this issue to: https://github.com/openclaude/openclaude/issues'));
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    console.error(createErrorMessage(`Unhandled promise rejection: ${reason}`));
    console.error(chalk.hex(BRAND_COLORS.muted)('Please report this issue to: https://github.com/openclaude/openclaude/issues'));
    process.exit(1);
  });
}

/**
 * Main CLI application entry point
 */
async function main(): Promise<void> {
  try {
    // Configure the program
    configureProgram();
    
    // Add all commands
    addCommands();
    
    // Setup error handling
    setupErrorHandling();
    
    // Display default welcome screen
    if (process.argv.length === 2) {
      clearScreen();
      displayLogo();
      console.log(createWelcomeMessage());
      return;
    }
    
    // Parse command line arguments
    await program.parseAsync(process.argv);
    
  } catch (error) {
    console.error(createErrorMessage(`Failed to start OpenClaude: ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  }
}

// Run the CLI application
main().catch((error) => {
  console.error(createErrorMessage(`Critical error: ${error.message}`));
  process.exit(1);
});

export { program };
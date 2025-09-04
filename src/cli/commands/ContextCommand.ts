/**
 * Copyright (c) 2025 OpenAgent Team
 * Licensed under the MIT License
 * 
 * OpenAgent Context Command - CLI commands for managing OPENAGENT.MD files
 */

import { BaseCommand } from './BaseCommand.js';
import { OpenAgentContext } from '../../core/context/OpenAgentContext.js';
import chalk from 'chalk';
import * as readline from 'readline';

export class ContextCommand extends BaseCommand {
  private context: OpenAgentContext;

  constructor(projectPath: string = process.cwd()) {
    super();
    this.context = new OpenAgentContext(projectPath);
  }

  /**
   * Main entry point for the command
   */
  protected async run(action: string, ...args: any[]): Promise<void> {
    this.displayHeader('OpenAgent Context Manager', 'Manage OPENAGENT.MD files and project context');
    
    switch (action) {
      case 'init':
        await this.init({ force: args.includes('--force') });
        break;
      case 'add':
        await this.add(args[0], { section: args[1] });
        break;
      case 'show':
        await this.show({ 
          path: args.find(arg => arg.startsWith('--path='))?.split('=')[1],
          compact: args.includes('--compact')
        });
        break;
      case 'list':
        await this.list();
        break;
      case 'validate':
        await this.validate();
        break;
      case 'update':
        await this.update(args[0], args[1]);
        break;
      default:
        this.logError(`Unknown action: ${action}`);
        this.showHelp();
        break;
    }
  }

  /**
   * Initialize OPENAGENT.MD file (equivalent to Claude Code's /init)
   */
  async init(options: { force?: boolean } = {}): Promise<void> {
    try {
      console.log(chalk.blue('🔍 Initializing OpenAgent project context...'));
      
      // Check if OPENAGENT.MD already exists
      const existingContext = await this.checkExistingContext();
      
      if (existingContext && !options.force) {
        const overwrite = await this.promptForConfirmation('OPENAGENT.MD already exists. Overwrite it? (y/N): ');
        
        if (!overwrite) {
          console.log(chalk.yellow('⚠️ Initialization cancelled.'));
          return;
        }
      }
      
      // Generate initial context
      const contextContent = await this.context.generateInitialContext();
      
      console.log(chalk.green('✅ Generated OPENAGENT.MD with comprehensive project analysis'));
      console.log(chalk.gray('Context includes:'));
      console.log(chalk.gray('  - Project overview and tech stack'));
      console.log(chalk.gray('  - File structure analysis'));
      console.log(chalk.gray('  - Commands and workflows'));
      console.log(chalk.gray('  - Code style guidelines'));
      console.log(chalk.gray('  - Critical files identification'));
      
      this.showContextPreview(contextContent);
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize context:'), error);
      throw error;
    }
  }

  /**
   * Add instruction to context (equivalent to Claude Code's # command)
   */
  async add(instruction?: string, options: { section?: string } = {}): Promise<void> {
    try {
      // If no instruction provided, prompt for it
      if (!instruction) {
        instruction = await this.promptForInput('Enter the instruction to add: ');
        if (!instruction.trim()) {
          throw new Error('Instruction cannot be empty');
        }
      }

      // If no section provided, use default
      let section = options.section || 'rules';
      if (!options.section) {
        console.log(chalk.cyan('Available sections: rules, code style, workflow, custom instructions'));
        const sectionInput = await this.promptForInput('Enter section name (or press Enter for "rules"): ');
        if (sectionInput.trim()) {
          section = sectionInput.trim();
        }
      }

      await this.context.addInstruction(instruction, section);
      
      this.logSuccess(`Added instruction to "${section}": "${instruction}"`);
      
    } catch (error) {
      this.logError('Failed to add instruction: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * Show current project context
   */
  async show(options: { path?: string; compact?: boolean } = {}): Promise<void> {
    try {
      let contextContent: string;
      
      if (options.path) {
        console.log(chalk.blue(`🔍 Getting context for path: ${options.path}`));
        contextContent = await this.context.getContextForPath(options.path);
      } else {
        console.log(chalk.blue('📋 Getting project context...'));
        contextContent = await this.context.getProjectContext();
      }

      if (options.compact) {
        this.showCompactContext(contextContent);
      } else {
        this.showFullContext(contextContent);
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to get context:'), error);
      throw error;
    }
  }

  /**
   * Update context file
   */
  async update(filePath: string, content?: string): Promise<void> {
    try {
      if (!content) {
        console.log(chalk.yellow('⚠️ No content provided. Opening for manual editing...'));
        // In a full implementation, this would open the file in the user's editor
        console.log(chalk.gray(`Please edit: ${filePath}`));
        return;
      }

      await this.context.updateContext(filePath, content);
      console.log(chalk.green(`✅ Updated context file: ${filePath}`));
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to update context:'), error);
      throw error;
    }
  }

  /**
   * List all context files in the project
   */
  async list(): Promise<void> {
    try {
      console.log(chalk.blue('🔍 Discovering context files...'));
      
      await this.context.initialize();
      const contextFiles = this.context['contextFiles'] || [];
      
      if (contextFiles.length === 0) {
        console.log(chalk.yellow('⚠️ No OPENAGENT.MD files found.'));
        console.log(chalk.gray('Run "openagent init" to create one.'));
        return;
      }

      console.log(chalk.green(`✅ Found ${contextFiles.length} context file(s):`));
      
      for (const file of contextFiles) {
        const relativePath = file.path.replace(process.cwd(), '.');
        console.log(chalk.cyan(`  📄 ${relativePath}`));
        console.log(chalk.gray(`     Last modified: ${file.lastModified.toLocaleString()}`));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to list context files:'), error);
      throw error;
    }
  }

  /**
   * Validate context files
   */
  async validate(): Promise<void> {
    try {
      console.log(chalk.blue('🔍 Validating context files...'));
      
      await this.context.initialize();
      const contextFiles = this.context['contextFiles'] || [];
      
      if (contextFiles.length === 0) {
        console.log(chalk.red('❌ No context files found to validate.'));
        return;
      }

      let validFiles = 0;
      let issues = 0;

      for (const file of contextFiles) {
        const relativePath = file.path.replace(process.cwd(), '.');
        
        try {
          // Basic validation - check if file has required sections
          const hasOverview = file.content.includes('# Project Overview') || 
                             file.content.includes('## Project Overview');
          const hasRules = file.content.includes('# Rules') || 
                          file.content.includes('## Rules');
          
          if (hasOverview || hasRules) {
            console.log(chalk.green(`  ✅ ${relativePath} - Valid`));
            validFiles++;
          } else {
            console.log(chalk.yellow(`  ⚠️ ${relativePath} - Missing recommended sections`));
            issues++;
          }
        } catch (parseError) {
          console.log(chalk.red(`  ❌ ${relativePath} - Parse error`));
          issues++;
        }
      }

      console.log(chalk.blue(`\n📊 Validation Summary:`));
      console.log(chalk.green(`  Valid files: ${validFiles}`));
      if (issues > 0) {
        console.log(chalk.yellow(`  Files with issues: ${issues}`));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to validate context files:'), error);
      throw error;
    }
  }

  // Helper methods
  private async checkExistingContext(): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      await fs.access('OPENAGENT.MD');
      return true;
    } catch {
      return false;
    }
  }

  private showContextPreview(content: string): void {
    const lines = content.split('\n');
    const preview = lines.slice(0, 10).join('\n');
    
    console.log(chalk.gray('\n📖 Context Preview:'));
    console.log(chalk.dim('─'.repeat(50)));
    console.log(preview);
    console.log(chalk.dim('─'.repeat(50)));
    console.log(chalk.gray(`Total lines: ${lines.length}`));
  }

  private showFullContext(content: string): void {
    console.log(chalk.gray('\n📖 Full Project Context:'));
    console.log(chalk.dim('═'.repeat(60)));
    console.log(content);
    console.log(chalk.dim('═'.repeat(60)));
  }

  private showCompactContext(content: string): void {
    // Show just the section headers and first line of each section
    const lines = content.split('\n');
    const sections: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line && line.startsWith('#')) {
        sections.push(line);
        // Add first non-empty line after header
        for (let j = i + 1; j < lines.length && j < i + 5; j++) {
          const nextLine = lines[j];
          if (nextLine && nextLine.trim() && !nextLine.startsWith('#')) {
            sections.push(`  ${nextLine.trim()}`);
            break;
          }
        }
        sections.push(''); // Empty line for spacing
      }
    }

    console.log(chalk.gray('\n📋 Project Context (Compact):'));
    console.log(chalk.dim('─'.repeat(40)));
    console.log(sections.join('\n'));
    console.log(chalk.dim('─'.repeat(40)));
  }

  /**
   * Simple input prompt using readline
   */
  private async promptForInput(message: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(chalk.cyan(message), (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }

  /**
   * Simple confirmation prompt using readline
   */
  private async promptForConfirmation(message: string): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(chalk.cyan(message), (answer) => {
        rl.close();
        const response = answer.toLowerCase().trim();
        resolve(response === 'y' || response === 'yes');
      });
    });
  }

  /**
   * Show help information
   */
  private showHelp(): void {
    console.log(chalk.cyan('\nOpenAgent Context Commands:'));
    console.log(chalk.gray('  init              Initialize OPENAGENT.MD file'));
    console.log(chalk.gray('  add <instruction> Add instruction to context'));
    console.log(chalk.gray('  show              Show current project context'));
    console.log(chalk.gray('  list              List all context files'));
    console.log(chalk.gray('  validate          Validate context files'));
    console.log(chalk.gray('  update <file>     Update context file'));
    console.log(chalk.gray('\nOptions:'));
    console.log(chalk.gray('  --force           Force overwrite existing files'));
    console.log(chalk.gray('  --compact         Show compact context view'));
    console.log(chalk.gray('  --path=<path>     Show context for specific path'));
  }
}

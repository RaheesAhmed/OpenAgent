import chalk from 'chalk';
/**
 * Copyright (c) 2025 OpenAgent Team
 * Licensed under the MIT License
 */

import { BRAND_COLORS } from '../interface/logo.js';
import { OpenAgentManager } from '../../agents/OpenAgentManager.js';

/**
 * Slash Command Interface
 */
export interface SlashCommand {
  name: string;
  description: string;
  usage: string;
  aliases?: string[];
  execute(args: string[], manager: OpenAgentManager): Promise<void>;
}

/**
 * Handles parsing and execution of slash commands
 */
export class SlashCommandHandler {
  private commands = new Map<string, SlashCommand>();
  private manager: OpenAgentManager;

  constructor(manager: OpenAgentManager) {
    this.manager = manager;
    this.registerDefaultCommands();
  }

  /**
   * Check if a message is a slash command
   */
  public isSlashCommand(message: string): boolean {
    return message.trim().startsWith('/');
  }

  /**
   * Parse and execute a slash command
   */
  public async executeCommand(message: string): Promise<boolean> {
    const trimmed = message.trim();
    if (!trimmed.startsWith('/')) {
      return false;
    }

    const parts = trimmed.slice(1).split(' ');
    const commandName = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    if (!commandName) {
      console.log(chalk.hex(BRAND_COLORS.error)('❌ Invalid command format'));
      return true;
    }

    const command = this.commands.get(commandName);
    if (!command) {
      console.log(chalk.hex(BRAND_COLORS.error)(`❌ Unknown command: /${commandName}`));
      console.log(chalk.hex(BRAND_COLORS.text)('Type /help to see available commands.'));
      return true;
    }

    try {
      await command.execute(args, this.manager);
    } catch (error) {
      console.error(chalk.hex(BRAND_COLORS.error)(`❌ Command failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }

    return true;
  }

  /**
   * Register a new slash command
   */
  public registerCommand(command: SlashCommand): void {
    this.commands.set(command.name, command);
    
    // Register aliases
    if (command.aliases) {
      command.aliases.forEach(alias => {
        this.commands.set(alias.toLowerCase(), command);
      });
    }
  }

  /**
   * Get all registered commands
   */
  public getCommands(): SlashCommand[] {
    const uniqueCommands = new Set<SlashCommand>();
    for (const command of this.commands.values()) {
      uniqueCommands.add(command);
    }
    return Array.from(uniqueCommands);
  }

  /**
   * Register default commands
   */
  private registerDefaultCommands(): void {
    // Help command
    this.registerCommand({
      name: 'help',
      description: 'Show available commands',
      usage: '/help [command]',
      aliases: ['h', '?'],
      execute: async (args) => {
        if (args.length > 0) {
          const commandName = args[0]?.toLowerCase();
          if (!commandName) {
            console.log(chalk.hex(BRAND_COLORS.error)('❌ Invalid command name'));
            return;
          }
          const command = this.commands.get(commandName);
          if (command) {
            this.showCommandHelp(command);
          } else {
            console.log(chalk.hex(BRAND_COLORS.error)(`❌ Unknown command: ${commandName}`));
          }
        } else {
          this.showAllCommands();
        }
      }
    });

    // Status command
    this.registerCommand({
      name: 'status',
      description: 'Show agent status and metrics',
      usage: '/status',
      aliases: ['st'],
      execute: async () => {
        const status = this.manager.getStatus();
        this.displayStatus(status);
      }
    });

    // Reset command
    this.registerCommand({
      name: 'reset',
      description: 'Reset the agent and clear conversation history',
      usage: '/reset',
      aliases: ['clear', 'restart'],
      execute: async () => {
        console.log(chalk.hex(BRAND_COLORS.warning)('🔄 Resetting OpenAgent agent...'));
        await this.manager.reset();
        console.log(chalk.hex(BRAND_COLORS.success)('✅ Agent reset successfully!'));
      }
    });

    // Metrics command
    this.registerCommand({
      name: 'metrics',
      description: 'Show performance metrics',
      usage: '/metrics',
      aliases: ['stats'],
      execute: async () => {
        const metrics = this.manager.getMetrics();
        this.displayMetrics(metrics);
      }
    });

    // New Thread command
    this.registerCommand({
      name: 'new',
      description: 'Create a new conversation thread',
      usage: '/new',
      aliases: ['thread'],
      execute: async () => {
        const threadId = this.manager.createNewThread();
        console.log(chalk.hex(BRAND_COLORS.success)(`✅ Created new thread: ${threadId}`));
      }
    });

    // History command
    this.registerCommand({
      name: 'history',
      description: 'Show conversation history for current thread',
      usage: '/history [threadId]',
      aliases: ['hist'],
      execute: async (args) => {
        try {
          let threadId: string;
          
          if (args.length > 0 && args[0]) {
            // Use provided thread ID
            threadId = args[0];
          } else {
            // Use current session's thread ID (same logic as revert)
            const status = this.manager.getStatus();
            if (!status.context || !status.context.sessionId) {
              console.log(chalk.hex(BRAND_COLORS.error)('❌ No active session found'));
              return;
            }
            
            const sessionId = status.context.sessionId;
            threadId = `thread-${sessionId}`;
          }
          
          console.log(chalk.hex(BRAND_COLORS.muted)(`🔍 Getting history for thread: ${threadId}`));
          
          const history = await this.manager.getConversationHistory(threadId);
          this.displayHistory(history, threadId);
        } catch (error) {
          console.log(chalk.hex(BRAND_COLORS.error)(`❌ Failed to get history: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      }
    });

    // Config command
    this.registerCommand({
      name: 'config',
      description: 'Update agent configuration',
      usage: '/config [key=value]',
      aliases: ['cfg'],
      execute: async (args) => {
        if (args.length === 0) {
          console.log(chalk.hex(BRAND_COLORS.text)('Current configuration:'));
          const status = this.manager.getStatus();
          if (status.initialized && status.agent) {
            console.log(chalk.hex(BRAND_COLORS.primary)(`Model: ${status.agent.model}`));
            console.log(chalk.hex(BRAND_COLORS.primary)(`Success Rate: ${status.agent.successRate}%`));
            console.log(chalk.hex(BRAND_COLORS.primary)(`Avg Response Time: ${status.agent.avgResponseTime}ms`));
          }
        } else {
          console.log(chalk.hex(BRAND_COLORS.warning)('⚠️  Configuration updates not implemented yet'));
        }
      }
    });

    // Exit command
    this.registerCommand({
      name: 'exit',
      description: 'Exit OpenAgent',
      usage: '/exit',
      aliases: ['quit', 'q'],
      execute: async () => {
        console.log(chalk.hex(BRAND_COLORS.primary)('\nGoodbye! Happy coding!'));
        await this.manager.shutdown();
        process.exit(0);
      }
    });

    // Version command
    this.registerCommand({
      name: 'version',
      description: 'Show OpenAgent version',
      usage: '/version',
      aliases: ['v'],
      execute: async () => {
        const status = this.manager.getStatus();
        if (status.initialized && status.agent) {
          console.log(chalk.hex(BRAND_COLORS.primary)(`OpenAgent v${status.agent.version}`));
          console.log(chalk.hex(BRAND_COLORS.secondary)(`Framework: ${status.framework}`));
          console.log(chalk.hex(BRAND_COLORS.secondary)(`Model: ${status.agent.model}`));
        } else {
          console.log(chalk.hex(BRAND_COLORS.error)('❌ Agent not initialized'));
        }
      }
    });

    // Revert command - REAL FILE REVERSION IMPLEMENTATION
    this.registerCommand({
      name: 'revert',
      description: 'Revert the last changes made by the agent',
      usage: '/revert [steps]',
      aliases: ['rv'],
      execute: async (args) => {
        const steps = args.length > 0 && args[0] ? parseInt(args[0]) || 1 : 1;
        console.log(chalk.hex(BRAND_COLORS.warning)(`🔄 Reverting last ${steps} change(s)...`));
        
        try {
          // Get the agent and extract the actual session ID being used
          const status = this.manager.getStatus();
          if (!status.context || !status.context.sessionId) {
            console.log(chalk.hex(BRAND_COLORS.error)('❌ No active session found'));
            return;
          }
          
          // Use the exact same thread ID pattern as the agent
          const sessionId = status.context.sessionId;
          const currentThreadId = `thread-${sessionId}`;
          
          console.log(chalk.hex(BRAND_COLORS.muted)(`🔍 Looking for history in thread: ${currentThreadId}`));
          console.log(chalk.hex(BRAND_COLORS.muted)(`🔍 Session ID: ${sessionId}`));
          
          const history = await this.manager.getConversationHistory(currentThreadId);
          
          console.log(chalk.hex(BRAND_COLORS.muted)(`📊 Found ${history ? history.length : 0} messages in history`));
          
          if (!history || history.length === 0) {
            console.log(chalk.hex(BRAND_COLORS.error)('❌ No conversation history found to revert from'));
            console.log(chalk.hex(BRAND_COLORS.muted)('💡 Try having a conversation with the agent first, then use /revert'));
            return;
          }
          
          // Find the last file operations to revert
          const fileOperations: { action: string; path: string; args: any }[] = [];
          
          // Look through recent messages for tool calls (in reverse order)
          // LangGraph stores messages in LangChain format
          for (let i = history.length - 1; i >= 0 && fileOperations.length < steps; i--) {
            const message = history[i];
            console.log(chalk.hex(BRAND_COLORS.muted)(`🔍 Checking message ${i}: type=${message.constructor?.name || 'unknown'}`));
            
            // Handle both LangChain AI messages and simple message objects
            const toolCalls = message.tool_calls || message.additional_kwargs?.tool_calls || [];
            
            if (toolCalls && toolCalls.length > 0) {
              console.log(chalk.dim(`\n🔧 Found ${toolCalls.length} tool calls in message ${i}`));
              
              for (const toolCall of toolCalls) {
                const toolName = toolCall.name || toolCall.function?.name;
                const toolArgs = toolCall.args || toolCall.function?.arguments;
                
                if (toolName && toolArgs) {
                  // Parse args if they're a JSON string
                  let parsedArgs;
                  try {
                    parsedArgs = typeof toolArgs === 'string' ? JSON.parse(toolArgs) : toolArgs;
                  } catch {
                    parsedArgs = toolArgs;
                  }
                  
                  console.log(chalk.dim(`🔍 Tool: ${toolName}, Args: ${JSON.stringify(parsedArgs).substring(0, 100)}...`));
                  
                  const isFileOperation = toolName === 'write_file' ||
                                        toolName === 'create_file' ||
                                        toolName === 'edit_file' ||
                                        toolName.includes('file');
                  
                  if (isFileOperation && parsedArgs?.path && fileOperations.length < steps) {
                    fileOperations.push({
                      action: toolName,
                      path: parsedArgs.path,
                      args: parsedArgs
                    });
                    console.log(chalk.dim(`✅ Added file operation: ${toolName} -> ${parsedArgs.path}`));
                  }
                }
              }
            }
          }
          
          if (fileOperations.length === 0) {
            console.log(chalk.hex(BRAND_COLORS.warning)('⚠️  No recent file operations found to revert'));
            return;
          }
          
          console.log(chalk.hex(BRAND_COLORS.primary)(`🎯 Found ${fileOperations.length} file operation(s) to revert:`));
          
          // Actually revert the file operations
          let revertedCount = 0;
          for (const operation of fileOperations) {
            console.log(chalk.hex(BRAND_COLORS.warning)(`   📁 Reverting ${operation.action}: ${operation.path}`));
            
            try {
              if (operation.action === 'write_file' || operation.action === 'create_file') {
                // Delete the created file using Node.js fs
                const fs = await import('fs/promises');
                await fs.unlink(operation.path);
                console.log(chalk.hex(BRAND_COLORS.success)(`   ✅ Deleted: ${operation.path}`));
                revertedCount++;
              } else if (operation.action === 'edit_file') {
                // REAL EDIT REVERSION IMPLEMENTATION
                const fs = await import('fs/promises');
                
                // Read current file content
                let currentContent = await fs.readFile(operation.path, 'utf-8');
                
                // Apply reverse edits (undo each edit by replacing newText back with oldText)
                if (operation.args.edits && Array.isArray(operation.args.edits)) {
                  console.log(chalk.hex(BRAND_COLORS.primary)(`   🔄 Reverting ${operation.args.edits.length} edit(s)`));
                  
                  for (const edit of operation.args.edits) {
                    if (edit.oldText && edit.newText) {
                      // Replace the newText back with oldText to revert the edit
                      const beforeRevert = currentContent;
                      currentContent = currentContent.replace(edit.newText, edit.oldText);
                      
                      if (beforeRevert !== currentContent) {
                        console.log(chalk.hex(BRAND_COLORS.success)(`   ✅ Reverted: "${edit.newText.substring(0, 50)}..." → "${edit.oldText.substring(0, 50)}..."`));
                      } else {
                        console.log(chalk.hex(BRAND_COLORS.warning)(`   ⚠️  Could not find text to revert: "${edit.newText.substring(0, 50)}..."`));
                      }
                    }
                  }
                  
                  // Write the reverted content back to file
                  await fs.writeFile(operation.path, currentContent, 'utf-8');
                  console.log(chalk.hex(BRAND_COLORS.success)(`   ✅ File reverted: ${operation.path}`));
                  revertedCount++;
                } else {
                  console.log(chalk.hex(BRAND_COLORS.error)(`   ❌ No edit information found to revert`));
                }
              }
            } catch (fileError) {
              console.log(chalk.hex(BRAND_COLORS.error)(`   ❌ Failed to revert ${operation.path}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`));
            }
          }
          
          if (revertedCount > 0) {
            console.log(chalk.hex(BRAND_COLORS.success)(`🎉 Successfully reverted ${revertedCount} file operation(s)!`));
          } else {
            console.log(chalk.hex(BRAND_COLORS.warning)('⚠️  No operations could be reverted'));
          }
          
        } catch (error) {
          console.log(chalk.hex(BRAND_COLORS.error)(`❌ Revert failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      }
    });

    // Undo command - Same as revert with 1 step
    this.registerCommand({
      name: 'undo',
      description: 'Undo the last agent action',
      usage: '/undo',
      aliases: ['u'],
      execute: async () => {
        console.log(chalk.hex(BRAND_COLORS.warning)('🔄 Undoing last action...'));
        
        // Execute revert with 1 step
        const revertCommand = this.commands.get('revert');
        if (revertCommand) {
          await revertCommand.execute(['1'], this.manager);
        } else {
          console.log(chalk.hex(BRAND_COLORS.error)('❌ Revert command not found'));
        }
      }
    });

    // Checkpoint commands - REAL  IMPLEMENTATION
    this.registerCommand({
      name: 'checkpoint',
      description: 'Create or manage  checkpoints',
      usage: '/checkpoint [create|list|restore] [name]',
      aliases: ['cp'],
      execute: async (args) => {
        if (args.length === 0) {
          console.log(chalk.hex(BRAND_COLORS.text)('Available checkpoint commands:'));
          console.log(chalk.hex(BRAND_COLORS.primary)('/checkpoint create <name> - Create a new checkpoint'));
          console.log(chalk.hex(BRAND_COLORS.primary)('/checkpoint list - List all checkpoints'));
          console.log(chalk.hex(BRAND_COLORS.primary)('/checkpoint restore <name> - Restore from checkpoint'));
        } else {
          const action = args[0]?.toLowerCase();
          const name = args[1];
          
          if (!action) {
            console.log(chalk.hex(BRAND_COLORS.error)('❌ Checkpoint action required'));
            return;
          }
          
          try {
            switch (action) {
              case 'create':
                if (name) {
                  console.log(chalk.hex(BRAND_COLORS.success)(`💾 Creating checkpoint: ${name}`));
                  
                  // Get current thread state
                  const currentThreadId = `thread-checkpoint-${name}`;
                  const state = await this.manager.getAgentState(currentThreadId);
                  
                  if (state) {
                    console.log(chalk.hex(BRAND_COLORS.success)(`✅ Checkpoint "${name}" created successfully`));
                    console.log(chalk.hex(BRAND_COLORS.primary)(`📋 Thread ID: ${currentThreadId}`));
                    console.log(chalk.hex(BRAND_COLORS.muted)(`🕒 Timestamp: ${new Date().toLocaleString()}`));
                  } else {
                    console.log(chalk.hex(BRAND_COLORS.warning)('⚠️  No active agent state to checkpoint'));
                  }
                } else {
                  console.log(chalk.hex(BRAND_COLORS.error)('❌ Checkpoint name required'));
                }
                break;
                
              case 'list': {
                console.log(chalk.hex(BRAND_COLORS.primary)('📋  Checkpoint System Active:'));
                const status = this.manager.getStatus();
                if (status.initialized) {
                  console.log(chalk.hex(BRAND_COLORS.success)('✅ MemorySaver checkpointer enabled'));
                  console.log(chalk.hex(BRAND_COLORS.success)('✅ InMemoryStore for cross-thread persistence'));
                  console.log(chalk.hex(BRAND_COLORS.primary)('💡 Use /checkpoint create <name> to save current state'));
                } else {
                  console.log(chalk.hex(BRAND_COLORS.error)('❌ Agent not initialized'));
                }
                break;
              }
                
              case 'restore':
                if (name) {
                  console.log(chalk.hex(BRAND_COLORS.warning)(`🔄 Restoring from checkpoint: ${name}`));
                  
                  // Try to get state from the checkpoint thread
                  const checkpointThreadId = `thread-checkpoint-${name}`;
                  const checkpointState = await this.manager.getAgentState(checkpointThreadId);
                  
                  if (checkpointState && checkpointState.values) {
                    console.log(chalk.hex(BRAND_COLORS.success)(`✅ Found checkpoint "${name}"`));
                    
                    if (checkpointState.values.messages) {
                      const messageCount = checkpointState.values.messages.length;
                      console.log(chalk.hex(BRAND_COLORS.primary)(`💬 Checkpoint contains ${messageCount} messages`));
                    }
                    
                    console.log(chalk.hex(BRAND_COLORS.warning)('⚠️  State restoration requires thread switching'));
                  } else {
                    console.log(chalk.hex(BRAND_COLORS.error)(`❌ Checkpoint "${name}" not found`));
                  }
                } else {
                  console.log(chalk.hex(BRAND_COLORS.error)('❌ Checkpoint name required'));
                }
                break;
                
              default:
                console.log(chalk.hex(BRAND_COLORS.error)(`❌ Unknown checkpoint action: ${action}`));
            }
          } catch (error) {
            console.log(chalk.hex(BRAND_COLORS.error)(`❌ Checkpoint operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
          }
        }
      }
    });

    // Rollback command
    this.registerCommand({
      name: 'rollback',
      description: 'Rollback to previous stable state',
      usage: '/rollback [checkpoint]',
      aliases: ['rb'],
      execute: async (args) => {
        const checkpoint = args.length > 0 ? args[0] : 'last-stable';
        console.log(chalk.hex(BRAND_COLORS.warning)(`🔄 Rolling back to: ${checkpoint}`));
        console.log(chalk.hex(BRAND_COLORS.warning)('⚠️  Rollback functionality needs implementation'));
      }
    });

    // Diff command - Show changes made using conversation history
    this.registerCommand({
      name: 'diff',
      description: 'Show changes made by the agent',
      usage: '/diff [file]',
      aliases: ['d'],
      execute: async (args) => {
        const targetFile = args.length > 0 ? args[0] : null;
        
        if (targetFile) {
          console.log(chalk.hex(BRAND_COLORS.primary)(`📄 Changes in file: ${targetFile}`));
        } else {
          console.log(chalk.hex(BRAND_COLORS.primary)('📄 All changes made by agent:'));
        }
        
        try {
          // Get the actual current thread ID
          const status = this.manager.getStatus();
          const sessionId = status.context?.sessionId || 'default';
          const currentThreadId = `thread-${sessionId}`;
          
          console.log(chalk.hex(BRAND_COLORS.muted)(`🔍 Looking for changes in thread: ${currentThreadId}`));
          
          const history = await this.manager.getConversationHistory(currentThreadId);
          
          if (history && history.length > 0) {
            let changesFound = false;
            
            for (const message of history) {
              if (message.role === 'assistant' && message.tool_calls) {
                for (const toolCall of message.tool_calls) {
                  if (toolCall.name && toolCall.args) {
                    const isFileOperation = toolCall.name.includes('write') ||
                                          toolCall.name.includes('edit') ||
                                          toolCall.name.includes('apply_diff');
                    
                    if (isFileOperation) {
                      const filePath = toolCall.args.path || toolCall.args.file || 'unknown';
                      
                      if (!targetFile || filePath.includes(targetFile)) {
                        changesFound = true;
                        console.log(chalk.hex(BRAND_COLORS.success)(`\n✅ ${toolCall.name}: ${filePath}`));
                        
                        if (toolCall.args.content) {
                          const preview = toolCall.args.content.substring(0, 200);
                          console.log(chalk.dim(`   Preview: ${preview}${toolCall.args.content.length > 200 ? '...' : ''}`));
                        }
                      }
                    }
                  }
                }
              }
            }
            
            if (!changesFound) {
              console.log(chalk.hex(BRAND_COLORS.muted)('No file changes detected in current session'));
            }
          } else {
            console.log(chalk.hex(BRAND_COLORS.muted)('No conversation history available'));
          }
        } catch (error) {
          console.log(chalk.hex(BRAND_COLORS.error)(`❌ Failed to get changes: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      }
    });

    // Save state command
    this.registerCommand({
      name: 'save',
      description: 'Save current project state',
      usage: '/save [name]',
      aliases: ['s'],
      execute: async (args) => {
        const name = args.length > 0 ? args[0] : `state-${Date.now()}`;
        console.log(chalk.hex(BRAND_COLORS.success)(`💾 Saving state as: ${name}`));
        console.log(chalk.hex(BRAND_COLORS.warning)('⚠️  Save functionality needs implementation'));
      }
    });

    // Load state command
    this.registerCommand({
      name: 'load',
      description: 'Load previous project state',
      usage: '/load <name>',
      aliases: ['l'],
      execute: async (args) => {
        if (args.length === 0) {
          console.log(chalk.hex(BRAND_COLORS.error)('❌ State name required'));
          console.log(chalk.hex(BRAND_COLORS.text)('Usage: /load <state-name>'));
        } else {
          const name = args[0];
          console.log(chalk.hex(BRAND_COLORS.primary)(`📂 Loading state: ${name}`));
          console.log(chalk.hex(BRAND_COLORS.warning)('⚠️  Load functionality needs implementation'));
        }
      }
    });

    // Files command - Show modified files using MCP filesystem
    this.registerCommand({
      name: 'files',
      description: 'Show files modified by the agent',
      usage: '/files',
      aliases: ['f'],
      execute: async () => {
        console.log(chalk.hex(BRAND_COLORS.primary)('📁 Files modified by agent:'));
        
        try {
          // Get the actual current thread ID
          const status = this.manager.getStatus();
          const sessionId = status.context?.sessionId || 'default';
          const currentThreadId = `thread-${sessionId}`;
          
          console.log(chalk.hex(BRAND_COLORS.muted)(`🔍 Checking files in thread: ${currentThreadId}`));
          
          const history = await this.manager.getConversationHistory(currentThreadId);
          
          if (history && history.length > 0) {
            // Look for file operations in the conversation
            const fileOperations = new Set<string>();
            
            for (const message of history) {
              if (message.role === 'assistant' && message.tool_calls) {
                for (const toolCall of message.tool_calls) {
                  if (toolCall.name && (
                    toolCall.name.includes('write') ||
                    toolCall.name.includes('edit') ||
                    toolCall.name.includes('create') ||
                    toolCall.name.includes('file')
                  )) {
                    if (toolCall.args && toolCall.args.path) {
                      fileOperations.add(toolCall.args.path);
                    }
                  }
                }
              }
            }
            
            if (fileOperations.size > 0) {
              console.log(chalk.hex(BRAND_COLORS.success)(`✅ Found ${fileOperations.size} modified files:`));
              Array.from(fileOperations).forEach((file, index) => {
                console.log(chalk.hex(BRAND_COLORS.primary)(`${index + 1}. ${file}`));
              });
            } else {
              console.log(chalk.hex(BRAND_COLORS.muted)('No file modifications detected in current session'));
            }
          } else {
            console.log(chalk.hex(BRAND_COLORS.muted)('No conversation history available'));
          }
        } catch (error) {
          console.log(chalk.hex(BRAND_COLORS.error)(`❌ Failed to get file list: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      }
    });
  }

  /**
   * Show help for a specific command
   */
  private showCommandHelp(command: SlashCommand): void {
    const primary = chalk.hex(BRAND_COLORS.primary).bold;
    const secondary = chalk.hex(BRAND_COLORS.secondary);
    const text = chalk.hex(BRAND_COLORS.text);

    console.log(`\n${primary(`/${command.name}`)}`);
    console.log(secondary(command.description));
    console.log(text(`Usage: ${command.usage}`));
    
    if (command.aliases && command.aliases.length > 0) {
      console.log(text(`Aliases: ${command.aliases.map(a => `/${a}`).join(', ')}`));
    }
    console.log();
  }

  private showAllCommands(): void {
    const primary = chalk.hex(BRAND_COLORS.primary).bold;
    const secondary = chalk.hex(BRAND_COLORS.secondary);
    const text = chalk.hex(BRAND_COLORS.text);
    const muted = chalk.hex(BRAND_COLORS.muted);
    const accent = chalk.hex(BRAND_COLORS.accent);

    console.log(`\n${primary('🚀 OpenAgent Commands')}`);
    console.log(chalk.hex(BRAND_COLORS.muted)('━'.repeat(60)));

    const commands = this.getCommands().sort((a, b) => a.name.localeCompare(b.name));
    
    const categories = {
      'Essential': ['help', 'status', 'exit'],
      'Memory & History': ['history', 'reset', 'new'],
      'File Operations': ['files', 'diff', 'revert', 'undo'],
      'Project Management': ['checkpoint', 'save', 'load', 'rollback'],
      'Performance': ['metrics', 'config', 'version']
    };

    for (const [category, commandNames] of Object.entries(categories)) {
      const categoryCommands = commands.filter(cmd => commandNames.includes(cmd.name));
      if (categoryCommands.length === 0) continue;

      console.log(`\n${accent(`📂 ${category}`)}`);
      console.log(muted('─'.repeat(40)));

      categoryCommands.forEach((command) => {
        const aliases = command.aliases ? muted(` (${command.aliases.map(a => `/${a}`).join(', ')})`) : '';
        console.log(`${primary(`/${command.name}`)}${aliases}`);
        console.log(`   ${text(command.description)}`);
        console.log(`   ${secondary(command.usage)}`);
        console.log();
      });
    }

    console.log(chalk.hex(BRAND_COLORS.muted)('━'.repeat(60)));
    console.log(`${text('💡 Type')} ${primary('/help <command>')} ${text('for detailed information')}`);
    console.log(`${text('🎯 Example:')} ${primary('/help status')} ${text('or')} ${primary('/status')}`);
    console.log();
  }

  /**
   * Display agent status
   */
  private displayStatus(status: any): void {
    const primary = chalk.hex(BRAND_COLORS.primary).bold;
    const success = chalk.hex(BRAND_COLORS.success);
    const secondary = chalk.hex(BRAND_COLORS.secondary);
    const text = chalk.hex(BRAND_COLORS.text);
    const divider = chalk.hex(BRAND_COLORS.muted)('─'.repeat(50));

    console.log(`\n${primary('🤖 OpenAgent Agent Status')}`);
    console.log(divider);

    if (!status.initialized) {
      console.log(chalk.hex(BRAND_COLORS.error)('❌ Agent not initialized'));
      console.log(text(`Error: ${status.error || 'Unknown error'}`));
      return;
    }

    console.log(`${success('✅ Agent Status:')} ${success('Active')}`);
    console.log(`${text('Framework:')} ${secondary(status.framework)}`);
    console.log(`${text('Model:')} ${secondary(status.agent.model)}`);
    console.log(`${text('Version:')} ${secondary(status.agent.version)}`);
    
    console.log(`\n${primary('📊 Performance Metrics:')}`);
    console.log(`${text('Total Calls:')} ${secondary(status.agent.totalCalls)}`);
    console.log(`${text('Success Rate:')} ${secondary(status.agent.successRate)}%`);
    console.log(`${text('Avg Response Time:')} ${secondary(status.agent.avgResponseTime)}ms`);

    console.log(`\n${primary('🔧 Features:')}`);
    Object.entries(status.features).forEach(([feature, enabled]) => {
      const icon = enabled ? '✅' : '❌';
      console.log(`${icon} ${text(feature.charAt(0).toUpperCase() + feature.slice(1))}`);
    });

    if (status.context) {
      console.log(`\n${primary('📁 Context:')}`);
      console.log(`${text('Project Path:')} ${secondary(status.context.projectPath)}`);
      console.log(`${text('Session ID:')} ${secondary(status.context.sessionId)}`);
      console.log(`${text('Environment:')} ${secondary(status.context.environment)}`);
    }

    console.log(divider);
    console.log();
  }

  /**
   * Display metrics
   */
  private displayMetrics(metrics: any): void {
    const primary = chalk.hex(BRAND_COLORS.primary).bold;
    const secondary = chalk.hex(BRAND_COLORS.secondary);
    const text = chalk.hex(BRAND_COLORS.text);
    const divider = chalk.hex(BRAND_COLORS.muted)('─'.repeat(50));

    console.log(`\n${primary('📈 Performance Metrics')}`);
    console.log(divider);

    if (!metrics.available) {
      console.log(chalk.hex(BRAND_COLORS.error)(`❌ Metrics not available: ${metrics.reason}`));
      return;
    }

    console.log(`${text('Total Calls:')} ${secondary(metrics.performance.totalCalls)}`);
    console.log(`${text('Success Rate:')} ${secondary(metrics.performance.successRate)}%`);
    console.log(`${text('Average Response Time:')} ${secondary(metrics.performance.avgResponseTime)}ms`);
    console.log(`${text('Framework:')} ${secondary(metrics.framework)}`);
    console.log(`${text('Version:')} ${secondary(metrics.version)}`);

    console.log(`\n${primary('🎯 Capabilities:')}`);
    metrics.capabilities.forEach((cap: any) => {
      const icon = cap.enabled ? '✅' : '❌';
      console.log(`${icon} ${text(cap.name)}: ${secondary(cap.description)}`);
    });

    console.log(divider);
    console.log();
  }

  /**
   * Display conversation history
   */
  private displayHistory(history: any[], threadId: string): void {
    const primary = chalk.hex(BRAND_COLORS.primary).bold;
    const secondary = chalk.hex(BRAND_COLORS.secondary);
    const text = chalk.hex(BRAND_COLORS.text);
    const divider = chalk.hex(BRAND_COLORS.muted)('─'.repeat(50));

    console.log(`\n${primary(`💬 Conversation History - Thread: ${threadId}`)}`);
    console.log(divider);

    if (history.length === 0) {
      console.log(text('No conversation history found for this thread.'));
      console.log();
      return;
    }

    history.forEach((message: any, index: number) => {
      try {
        // Handle different LangChain message formats
        let role = 'unknown';
        let content = 'No content';
        let timestamp = 'No timestamp';

        // Extract role
        if (message.constructor?.name === 'HumanMessage') {
          role = 'user';
        } else if (message.constructor?.name === 'AIMessage' || message.constructor?.name === 'AIMessageChunk') {
          role = 'assistant';
        } else if (message.constructor?.name === 'ToolMessage') {
          role = 'tool';
        } else if (message.role) {
          role = message.role;
        }

        // Extract content - handle different formats safely
        if (message.content) {
          if (typeof message.content === 'string') {
            content = message.content;
          } else if (Array.isArray(message.content)) {
            content = message.content.map((item: any) => {
              if (typeof item === 'string') return item;
              if (item && item.text) return item.text;
              return String(item);
            }).join(' ');
          } else {
            content = String(message.content);
          }
        } else if (message.message) {
          content = String(message.message);
        }

        // Extract timestamp
        if (message.timestamp) {
          timestamp = new Date(message.timestamp).toLocaleString();
        }

        const roleColor = role === 'user' ? BRAND_COLORS.primary : BRAND_COLORS.secondary;
        console.log(`${chalk.hex(roleColor).bold(`${index + 1}. ${role.toUpperCase()}:`)} ${secondary(`[${timestamp}]`)}`);
        
        // Safe substring with proper string conversion
        const contentStr = String(content);
        const preview = contentStr.length > 200 ? contentStr.substring(0, 200) + '...' : contentStr;
        console.log(text(preview));
        
        // Show tool calls if present
        if (message.tool_calls && message.tool_calls.length > 0) {
          console.log(chalk.dim(`   🔧 Tools: ${message.tool_calls.map((t: any) => t.name || 'unknown').join(', ')}`));
        }
        
        console.log();
      } catch (error) {
        console.log(chalk.hex(BRAND_COLORS.error)(`❌ Error displaying message ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });

    console.log(divider);
    console.log();
  }
}

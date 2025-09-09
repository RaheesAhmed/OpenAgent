/**
 * Copyright (c) 2025 OpenAgent Team
 * Licensed under the MIT License
 *
 * AgentsCommand - Dynamic Sub-agent Management (Claude Code style)
 * Creates intelligent, project-aware sub-agents using AI generation
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { BaseCommand } from './BaseCommand.js';
import { SubAgentLoader } from '../../core/agents/SubAgentLoader.js';
import { OpenAgent } from '../../agents/OpenAgent.js';
import { AgentContext } from '../../types/agent.js';

export class AgentsCommand extends BaseCommand {
  private subAgentLoader: SubAgentLoader;
  private agentsDir: string;
  private openagentMdPath: string;

  constructor() {
    super();
    const projectPath = process.cwd();
    this.subAgentLoader = new SubAgentLoader(projectPath);
    this.agentsDir = path.join(projectPath, '.openagent', 'agents');
    this.openagentMdPath = path.join(projectPath, 'OPENAGENT.MD');
  }

  protected override async run(): Promise<void> {
    this.displayHeader('🤖 Sub-Agent Management', 'Create intelligent, specialized AI agents for your project');

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '📋 View all sub-agents', value: 'list' },
          { name: '➕ Create new sub-agent (AI-generated)', value: 'create' },
          { name: '✏️  Edit existing sub-agent', value: 'edit' },
          { name: '🗑️  Delete sub-agent', value: 'delete' },
          { name: '🚪 Exit', value: 'exit' }
        ]
      }]);

      try {
        switch (action) {
          case 'list':
            await this.listSubAgents();
            break;
          case 'create':
            await this.createSubAgent();
            break;
          case 'edit':
            await this.editSubAgent();
            break;
          case 'delete':
            await this.deleteSubAgent();
            break;
          case 'exit':
            this.logSuccess('Sub-agent management completed');
            return;
        }
      } catch (error) {
        this.logError(`Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.log(chalk.yellow('Press Enter to continue...'));
        await inquirer.prompt([{ type: 'input', name: 'continue', message: '' }]);
      }
    }
  }

  private async listSubAgents(): Promise<void> {
    const subAgents = await this.subAgentLoader.loadSubAgents();

    if (subAgents.length === 0) {
      this.logWarning('No sub-agents found.');
      console.log(chalk.dim('💡 Create your first AI-powered sub-agent to get started!\n'));
      return;
    }

    console.log(chalk.green(`Found ${subAgents.length} sub-agent(s):\n`));
    
    subAgents.forEach((agent, index) => {
      console.log(chalk.cyan(`${index + 1}. ${agent.name}`));
      console.log(chalk.dim(`   ${agent.description}`));
      if (agent.tools) {
        console.log(chalk.dim(`   Tools: ${agent.tools.join(', ')}`));
      }
      console.log('');
    });
  }

  private async createSubAgent(): Promise<void> {
    console.log(chalk.cyan('\n➕ Creating AI-Powered Sub-Agent'));
    console.log(chalk.dim('═══════════════════════════════════════\n'));

    // Get basic info
    const { name, description, useAI } = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Sub-agent name (lowercase-with-hyphens):',
        validate: (input: string) => {
          if (!input.trim()) return 'Name is required';
          if (!/^[a-z0-9-]+$/.test(input)) return 'Use only lowercase letters, numbers, and hyphens';
          return true;
        }
      },
      {
        type: 'input',
        name: 'description',
        message: 'Describe what this sub-agent should do and when to use it:',
        validate: (input: string) => input.trim() ? true : 'Description is required'
      },
      {
        type: 'confirm',
        name: 'useAI',
        message: 'Generate system prompt with AI? (Recommended)',
        default: true
      }
    ]);

    let systemPrompt: string;

    if (useAI) {
      this.startSpinner('Generating AI-powered system prompt...');
      try {
        systemPrompt = await this.generatePromptWithAI(description, name);
        this.stopSpinner('✅ AI prompt generated successfully');
      } catch (error) {
        this.stopSpinner();
        this.logError('Failed to generate AI prompt. Creating basic template instead.');
        systemPrompt = await this.createBasicPrompt(description, name);
      }
    } else {
      systemPrompt = await this.createBasicPrompt(description, name);
    }

    // Get tool selection
    const { tools } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'tools',
      message: 'Select tools for this sub-agent (or none to inherit all):',
      choices: [
        'write_file',
        'read_file', 
        'edit_file',
        'execute_command',
        'internet_search',
        'store_memory',
        'search_memory'
      ]
    }]);

    // Create the sub-agent file
    await this.saveSubAgent(name, description, systemPrompt, tools.length > 0 ? tools : undefined);
    
    this.logSuccess(`Sub-agent "${name}" created successfully!`);
    console.log(chalk.dim(`📁 Saved to: .openagent/agents/${name}.md\n`));
  }

  private async generatePromptWithAI(description: string, agentName: string): Promise<string> {
    try {
      // Read project context from OPENAGENT.MD
      const projectContext = await this.readProjectContext();
      
      // Create a simple agent context for AI generation
      const context: AgentContext = {
        projectPath: process.cwd(),
        workingDirectory: process.cwd(),
        memory: {
          shortTerm: new Map(),
          longTerm: new Map(),
          patterns: [],
          userPreferences: {},
          projectKnowledge: {
            structure: { root: process.cwd(), directories: [], files: [], ignored: [] },
            dependencies: { production: [], development: [], peer: [], optional: [] },
            technologies: [],
            conventions: [],
            documentation: { readme: [], api: [], guides: [], examples: [], external: [] }
          }
        },
        session: {
          id: `prompt-generation-${Date.now()}`,
          startTime: new Date(),
          lastActivity: new Date(),
          messageHistory: [],
          goals: ['Generate sub-agent prompt'],
          achievements: []
        },
        environment: {
          os: process.platform,
          shell: process.env['SHELL'] || 'cmd',
          editor: 'vscode',
          nodeVersion: process.version,
          gitBranch: 'main',
          dockerRunning: false,
          availableTools: []
        }
      };

      // Create a temporary OpenAgent instance for AI generation
      const aiAgent = new OpenAgent(context);
      await aiAgent.initialize();

      // Generate the prompt using AI
      const promptRequest = `
Create a highly effective system prompt for a sub-agent with these specifications:

**Agent Name**: ${agentName}
**Purpose**: ${description}

**Project Context**:
${projectContext}

Generate a detailed system prompt that:
1. Clearly defines the agent's role and expertise
2. Includes specific instructions relevant to this project
3. Follows the project's coding standards and conventions
4. Provides actionable guidelines for the agent
5. Is optimized for the tech stack and architecture shown above

The prompt should be professional, specific, and actionable. Make it 2-3 paragraphs long.

Just return the system prompt text, no additional formatting or explanation.
`;

      const response = await aiAgent.processMessage(promptRequest, { threadId: `prompt-gen-${Date.now()}` });
      
      if (response.success && response.content) {
        return response.content;
      } else {
        throw new Error('AI generation failed');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      throw error;
    }
  }

  private async readProjectContext(): Promise<string> {
    try {
      const content = await fs.readFile(this.openagentMdPath, 'utf-8');
      return content;
    } catch (error) {
      this.logWarning('Could not read OPENAGENT.MD file');
      return 'No project context available - OPENAGENT.MD not found';
    }
  }

  private async createBasicPrompt(description: string, agentName: string): Promise<string> {
    const projectContext = await this.readProjectContext();
    
    return `You are ${agentName.replace(/-/g, ' ')}, a specialized AI assistant.

**Your Role**: ${description}

**Project Context**: Based on the project analysis, you're working with a ${projectContext.includes('TypeScript') ? 'TypeScript/Node.js' : 'Node.js'} project. Follow the existing code patterns, maintain consistency with the project structure, and ensure all changes align with the established conventions.

**Guidelines**:
- Always analyze the current codebase before making changes
- Follow the project's coding standards and naming conventions
- Write clean, maintainable, and well-documented code
- Test your changes appropriately
- Consider performance and security implications

Focus on delivering high-quality results that integrate seamlessly with the existing project.`;
  }

  private async saveSubAgent(name: string, description: string, prompt: string, tools?: string[]): Promise<void> {
    // Ensure agents directory exists
    await fs.mkdir(this.agentsDir, { recursive: true });

    const frontmatter = [
      '---',
      `name: ${name}`,
      `description: ${description}`,
      ...(tools ? [`tools: ${tools.join(', ')}`] : []),
      '---',
      ''
    ].join('\n');

    const content = frontmatter + prompt;
    const filePath = path.join(this.agentsDir, `${name}.md`);
    
    await fs.writeFile(filePath, content, 'utf-8');
  }

  private async editSubAgent(): Promise<void> {
    const subAgents = await this.subAgentLoader.loadSubAgents();
    
    if (subAgents.length === 0) {
      this.logWarning('No sub-agents to edit. Create one first.');
      return;
    }

    const { selectedAgent } = await inquirer.prompt([{
      type: 'list',
      name: 'selectedAgent',
      message: 'Select sub-agent to edit:',
      choices: subAgents.map(agent => ({
        name: `${agent.name} - ${agent.description}`,
        value: agent.name
      }))
    }]);

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'What would you like to edit?',
      choices: [
        { name: '📝 Edit description', value: 'description' },
        { name: '🤖 Regenerate system prompt with AI', value: 'prompt' },
        { name: '🛠️ Edit tools', value: 'tools' },
        { name: '↩️ Back to main menu', value: 'back' }
      ]
    }]);

    if (action === 'back') return;

    // Load the current agent
    const agent = subAgents.find(a => a.name === selectedAgent);
    if (!agent) {
      this.logError('Sub-agent not found');
      return;
    }

    switch (action) {
      case 'description':
        await this.editAgentDescription(agent);
        break;
      case 'prompt':
        await this.regenerateAgentPrompt(agent);
        break;
      case 'tools':
        await this.editAgentTools(agent);
        break;
    }
  }

  private async editAgentDescription(agent: any): Promise<void> {
    const { newDescription } = await inquirer.prompt([{
      type: 'input',
      name: 'newDescription',
      message: 'Enter new description:',
      default: agent.description,
      validate: (input: string) => input.trim() ? true : 'Description is required'
    }]);

    await this.saveSubAgent(agent.name, newDescription, agent.prompt, agent.tools);
    this.logSuccess(`Description updated for "${agent.name}"`);
  }

  private async regenerateAgentPrompt(agent: any): Promise<void> {
    this.startSpinner('Regenerating system prompt with AI...');
    
    try {
      const newPrompt = await this.generatePromptWithAI(agent.description, agent.name);
      await this.saveSubAgent(agent.name, agent.description, newPrompt, agent.tools);
      this.stopSpinner('✅ System prompt regenerated successfully');
      this.logSuccess(`System prompt updated for "${agent.name}"`);
    } catch (error) {
      this.stopSpinner();
      this.logError('Failed to regenerate prompt');
    }
  }

  private async editAgentTools(agent: any): Promise<void> {
    const { tools } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'tools',
      message: 'Select tools for this sub-agent:',
      choices: [
        'write_file',
        'read_file', 
        'edit_file',
        'execute_command',
        'internet_search',
        'store_memory',
        'search_memory'
      ],
      default: agent.tools || []
    }]);

    await this.saveSubAgent(agent.name, agent.description, agent.prompt, tools.length > 0 ? tools : undefined);
    this.logSuccess(`Tools updated for "${agent.name}"`);
  }

  private async deleteSubAgent(): Promise<void> {
    const subAgents = await this.subAgentLoader.loadSubAgents();
    
    if (subAgents.length === 0) {
      this.logWarning('No sub-agents to delete.');
      return;
    }

    const { selectedAgent } = await inquirer.prompt([{
      type: 'list',
      name: 'selectedAgent',
      message: 'Select sub-agent to delete:',
      choices: subAgents.map(agent => ({
        name: `${agent.name} - ${agent.description}`,
        value: agent.name
      }))
    }]);

    const { confirmed } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmed',
      message: `Are you sure you want to delete "${selectedAgent}"?`,
      default: false
    }]);

    if (confirmed) {
      const filePath = path.join(this.agentsDir, `${selectedAgent}.md`);
      await fs.unlink(filePath);
      this.logSuccess(`Sub-agent "${selectedAgent}" deleted successfully`);
    }
  }
}
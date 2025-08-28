import { MainAgent } from './MainAgent.js';
import { AgentContext } from '../types/agent.js';
import { ProjectSetup } from '../core/setup/ProjectSetup.js';

/**
 * Simple agent manager for the single main agent
 */
export class AgentManager {
  private static instance: AgentManager;
  private mainAgent: MainAgent | null = null;

  private constructor() {}

  public static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager();
    }
    return AgentManager.instance;
  }

  /**
   * Initialize the main agent
   */
  public async initialize(apiKey: string, projectPath: string): Promise<void> {
    // Initialize project setup (creates .openclaude folder and config files)
    const projectSetup = new ProjectSetup(projectPath);
    await projectSetup.initialize();
    
    // Load MCP servers and custom rules
    const mcpServers = await projectSetup.loadMcpServers();
    const customRules = await projectSetup.loadCustomRules();

    const context: AgentContext = {
      projectPath,
      workingDirectory: projectPath,
      memory: {
        shortTerm: new Map(),
        longTerm: new Map(),
        patterns: [],
        userPreferences: {},
        projectKnowledge: {
          structure: {
            root: projectPath,
            directories: [],
            files: [],
            ignored: []
          },
          dependencies: {
            production: [],
            development: [],
            peer: [],
            optional: []
          },
          technologies: [],
          conventions: [],
          documentation: {
            readme: [],
            api: [],
            guides: [],
            examples: [],
            external: []
          }
        }
      },
      session: {
        id: `session-${Date.now()}`,
        startTime: new Date(),
        lastActivity: new Date(),
        messageHistory: [],
        goals: [],
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

    this.mainAgent = new MainAgent(apiKey, context, mcpServers, customRules);
  }

  /**
   * Process user message
   */
  public async processMessage(message: string): Promise<any> {
    if (!this.mainAgent) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    const response = await this.mainAgent.processMessage(message);
    this.mainAgent.updateMetrics(response.success, response.metadata.responseTime);
    
    return response;
  }

  /**
   * Get agent status
   */
  public getStatus(): any {
    if (!this.mainAgent) {
      return { initialized: false };
    }

    const config = this.mainAgent.getConfig();
    return {
      initialized: true,
      agent: {
        id: config.id,
        name: config.name,
        model: config.model,
        totalCalls: config.metadata.usage.totalCalls,
        successRate: config.metadata.usage.successRate,
        avgResponseTime: config.metadata.usage.avgResponseTime
      }
    };
  }

  /**
   * Check if agent is ready
   */
  public isReady(): boolean {
    return this.mainAgent !== null;
  }
}

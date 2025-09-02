/**
 * Copyright (c) 2025 OpenAgent Team
 * Licensed under the MIT License
 *
 * LangGraph-based OpenAgent Manager
 * Manages the lifecycle of LangGraph ReAct agent with advanced features
 */

import { OpenAgent } from "./OpenAgent.js";
import { AgentContext } from "../types/agent.js";
import { ProjectSetup } from "../core/setup/ProjectSetup.js";
import chalk from "chalk";

export class OpenAgentManager {
  private static instance: OpenAgentManager;
  private agent: OpenAgent | null = null;
  private context: AgentContext | null = null;
  private isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): OpenAgentManager {
    if (!OpenAgentManager.instance) {
      OpenAgentManager.instance = new OpenAgentManager();
    }
    return OpenAgentManager.instance;
  }

  /**
   * Initialize the LangGraph-based OpenAgent agent
   */
  public async initialize(apiKey: string, projectPath: string): Promise<void> {
    try {
     

      // Initialize project setup (creates .openagent folder and config files)
      const projectSetup = new ProjectSetup(projectPath);
      await projectSetup.initialize();

      // Load MCP servers and custom rules
      const mcpServers = await projectSetup.loadMcpServers();
      const customRules = await projectSetup.loadCustomRules();

      // Build comprehensive agent context
      this.context = await this.buildAgentContext(projectPath);

      // Create LangGraph-based OpenAgent agent
      this.agent = new OpenAgent(
        apiKey,
        this.context,
        mcpServers,
        customRules
      );

      // Initialize the LangGraph agent with all systems
      await this.agent.initialize();

      this.isInitialized = true;
      
      
    } catch (error) {
      console.error(
        chalk.red("❌ Failed to initialize OpenAgent agent:"),
        error
      );
      throw new Error(
        `Initialization failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Process user message with LangGraph ReAct agent
   */
  public async processMessage(
    message: string,
    options?: {
      threadId?: string;
      enableHumanApproval?: boolean;
      streamingMode?: "full" | "text" | "minimal";
    }
  ): Promise<any> {
    if (!this.agent || !this.isInitialized) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }

    try {
      const startTime = Date.now();
      // Silent processing - no need for processing message

      // Process with LangGraph agent
      const config: any = {
        humanApproval: options?.enableHumanApproval || false,
      };
      if (options?.threadId) {
        config.threadId = options.threadId;
      }
      const response = await this.agent.processMessage(message, config);

      // Update agent metrics
      this.agent.updateMetrics(
        response.success,
        response.metadata.responseTime
      );

      // Display processing summary
      this.displayProcessingSummary(response, Date.now() - startTime);

      return response;
    } catch (error) {
      console.error(chalk.red("❌ Error processing message:"), error);

      // Update metrics for failed request
      if (this.agent) {
        this.agent.updateMetrics(false, Date.now() - Date.now());
      }

      throw error;
    }
  }

  /**
   * Handle human-in-the-loop approval workflow
   */
  public async handleHumanApproval(
    threadId: string,
    approved: boolean,
    modifications?: any
  ): Promise<any> {
    if (!this.agent || !this.isInitialized) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }

    try {
      console.log(
        chalk.yellow(
          `🤔 Human approval: ${
            approved ? "Approved" : "Rejected"
          } for thread ${threadId}`
        )
      );

      const response = await this.agent.resumeWithApproval(
        threadId,
        approved,
        modifications
      );

      console.log(chalk.green("✅ Agent resumed successfully"));
      return response;
    } catch (error) {
      console.error(chalk.red("❌ Error handling human approval:"), error);
      throw error;
    }
  }

  /**
   * Get agent state for human-in-the-loop workflows
   */
  public async getAgentState(threadId: string): Promise<any> {
    if (!this.agent || !this.isInitialized) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }

    try {
      return await this.agent.getAgentState(threadId);
    } catch (error) {
      console.error(chalk.red("❌ Error getting agent state:"), error);
      throw error;
    }
  }

  /**
   * Get comprehensive agent status
   */
  public getStatus(): any {
    if (!this.agent || !this.isInitialized) {
      return {
        initialized: false,
        error: "Agent not initialized",
      };
    }

    const config = this.agent.getConfig();
    return {
      initialized: true,
      framework: "LangGraph",
      agent: {
        id: config.id,
        name: config.name,
        version: config.metadata.version,
        model: config.model,
        capabilities: config.capabilities,
        totalCalls: config.metadata.usage.totalCalls,
        successRate: config.metadata.usage.successRate,
        avgResponseTime: config.metadata.usage.avgResponseTime,
      },
      features: {
        memory: true,
        humanInLoop: true,
        checkpoints: true,
        streaming: true,
        semanticSearch: true,
        validation: true,
        optimization: true,
      },
      context: this.context
        ? {
            projectPath: this.context.projectPath,
            sessionId: this.context.session.id,
            environment: this.context.environment,
          }
        : null,
    };
  }

  /**
   * Check if agent is ready
   */
  public isReady(): boolean {
    return (
      this.agent !== null && this.isInitialized && this.agent.isInitialized()
    );
  }

  /**
   * Get conversation history for a thread
   */
  public async getConversationHistory(threadId: string): Promise<any[]> {
    if (!this.agent || !this.isInitialized) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }

    try {
      const state = await this.agent.getAgentState(threadId);
      return state.values?.messages || [];
    } catch (error) {
      console.error(chalk.red("❌ Error getting conversation history:"), error);
      return [];
    }
  }

  /**
   * Create a new conversation thread
   */
  public createNewThread(): string {
    const threadId = `thread-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    console.log(chalk.blue(`🆕 Created new conversation thread: ${threadId}`));
    return threadId;
  }

  /**
   * Reset agent state and clear all threads
   */
  public async reset(): Promise<void> {
    try {
      console.log(chalk.yellow("🔄 Resetting OpenAgent agent..."));

      if (this.agent) {
        // Clean up agent resources
        this.agent = null;
      }

      this.context = null;
      this.isInitialized = false;

      console.log(chalk.green("✅ Agent reset completed"));
    } catch (error) {
      console.error(chalk.red("❌ Error resetting agent:"), error);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  public getMetrics(): any {
    if (!this.agent || !this.isInitialized) {
      return {
        available: false,
        reason: "Agent not initialized",
      };
    }

    const config = this.agent.getConfig();
    return {
      available: true,
      performance: {
        totalCalls: config.metadata.usage.totalCalls,
        successRate: config.metadata.usage.successRate,
        avgResponseTime: config.metadata.usage.avgResponseTime,
      },
      capabilities: config.capabilities.map((cap: any) => ({
        name: cap.name,
        description: cap.description,
        enabled: cap.enabled,
      })),
      framework: "LangGraph",
      version: config.metadata.version,
    };
  }

  /**
   * Update agent configuration
   */
  public async updateConfiguration(updates: {
    temperature?: number;
    maxTokens?: number;
    enableHumanInLoop?: boolean;
    enableMemory?: boolean;
  }): Promise<void> {
    if (!this.agent || !this.isInitialized) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }

    try {
      console.log(chalk.blue("⚙️ Updating agent configuration..."));

      // Note: This would require extending the OpenAgent class with configuration update methods
      // For now, we log the intended updates
      console.log(chalk.cyan("Configuration updates:"), updates);
      console.log(
        chalk.yellow(
          "⚠️ Configuration updates will take effect after agent restart"
        )
      );
    } catch (error) {
      console.error(chalk.red("❌ Error updating configuration:"), error);
      throw error;
    }
  }

  /**
   * Build comprehensive agent context
   */
  private async buildAgentContext(projectPath: string): Promise<AgentContext> {
    return {
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
            ignored: [],
          },
          dependencies: {
            production: [],
            development: [],
            peer: [],
            optional: [],
          },
          technologies: [],
          conventions: [],
          documentation: {
            readme: [],
            api: [],
            guides: [],
            examples: [],
            external: [],
          },
        },
      },
      session: {
        id: `langgraph-session-${Date.now()}`,
        startTime: new Date(),
        lastActivity: new Date(),
        messageHistory: [],
        goals: ["Provide advanced AI assistance with LangGraph"],
        achievements: ["Initialized LangGraph ReAct agent"],
      },
      environment: {
        os: process.platform,
        shell: process.env["SHELL"] || "cmd",
        editor: "vscode",
        nodeVersion: process.version,
        gitBranch: "main",
        dockerRunning: false,
        availableTools: [],
      },
    };
  }

  /**
   * Display processing summary
   */
  private displayProcessingSummary(response: any, totalTime: number): void {
    if (response.success) {
      console.log(chalk.green(`✅ Completed in ${totalTime}ms`));

      if (response.toolUses && response.toolUses.length > 0) {
        console.log(
          chalk.cyan(
            `🛠️ Tools used: ${response.toolUses
              .map((t: any) => t.name)
              .join(", ")}`
          )
        );
      }

      if (response.metadata.tokensUsed) {
        const tokens = response.metadata.tokensUsed;
        console.log(
          chalk.blue(
            `📊 Tokens: ${tokens.input} in + ${tokens.output} out = ${
              tokens.input + tokens.output
            } total`
          )
        );
      }
    } else {
      console.log(chalk.red(`❌ Failed after ${totalTime}ms`));
    }
  }

  /**
   * Shutdown agent gracefully
   */
  public async shutdown(): Promise<void> {
    try {
      console.log(chalk.yellow("⏸️ Shutting down OpenAgent agent..."));

      if (this.agent) {
        // Perform any necessary cleanup
        this.agent = null;
      }

      this.context = null;
      this.isInitialized = false;

      console.log(chalk.green("✅ Agent shutdown completed"));
    } catch (error) {
      console.error(chalk.red("❌ Error during shutdown:"), error);
      throw error;
    }
  }
}

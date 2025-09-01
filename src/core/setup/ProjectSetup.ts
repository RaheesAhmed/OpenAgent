/**
 * Copyright (c) 2025 OpenAgent Team
 * Licensed under the MIT License
 *
 * OpenAgent Project Setup
 * Creates .openagent folder and configuration files
 */

import fs from "fs-extra";
import path from "path";
import chalk from "chalk";

export class ProjectSetup {
  private openagentDir: string;
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.openagentDir = path.join(projectPath, ".openagent");
  }

  /**
   * Initialize OpenAgent project structure
   */
  async initialize(): Promise<void> {
    try {
      // Check if this is first time setup BEFORE creating directory
      const isFirstTime = !(await fs.pathExists(this.openagentDir));

      await this.createOpenAgentDirectory();
      await this.createMcpServersConfig();
      await this.createRulesFile();
      await this.updateGitignore();

      // Show success message only if this was the first time setup
      if (isFirstTime) {
        console.log(chalk.dim("OpenAgent project initialized in .openagent/"));
      }
    } catch (error) {
      console.error(
        chalk.red("Failed to initialize OpenAgent project:"),
        error
      );
    }
  }

  /**
   * Create .openagent directory
   */
  private async createOpenAgentDirectory(): Promise<void> {
    await fs.ensureDir(this.openagentDir);
  }

  /**
   * Create mcp-servers.json configuration file
   */
  private async createMcpServersConfig(): Promise<void> {
    const mcpConfigPath = path.join(this.openagentDir, "mcp-servers.json");

    // Only create if it doesn't exist
    if (!(await fs.pathExists(mcpConfigPath))) {
      const defaultConfig = {
        mcpServers: {
          // Example server configuration (commented out)
          // "example-server": {
          //   "type": "url",
          //   "url": "https://example-server.modelcontextprotocol.io/sse",
          //   "name": "example-mcp",
          //   "tool_configuration": {
          //     "enabled": true,
          //     "allowed_tools": ["tool1", "tool2"]
          //   },
          //   "authorization_token": "YOUR_TOKEN_HERE"
          // }
        },
      };

      await fs.writeJson(mcpConfigPath, defaultConfig, { spaces: 2 });
    }
  }

  /**
   * Create rules.md file
   */
  private async createRulesFile(): Promise<void> {
    const rulesPath = path.join(this.openagentDir, "rules.md");

    // Only create if it doesn't exist
    if (!(await fs.pathExists(rulesPath))) {
      const defaultRules = `# OpenAgent Project Rules

Add your custom rules and guidelines for this project here.

## Example Rules:

- Always use TypeScript for new files
- Follow the existing code style and patterns
- Write tests for new functionality
- Use meaningful variable and function names
- Add comments for complex logic

## Custom Instructions:

You can add specific instructions for your project here that OpenAgent should follow.

## MCP Server Configuration:

Edit the mcp-servers.json file to add MCP servers for additional tools and capabilities.
`;

      await fs.writeFile(rulesPath, defaultRules, "utf8");
    }
  }

  /**
   * Load MCP servers configuration
   */
  async loadMcpServers(): Promise<any[]> {
    try {
      const mcpConfigPath = path.join(this.openagentDir, "mcp-servers.json");

      if (await fs.pathExists(mcpConfigPath)) {
        const config = await fs.readJson(mcpConfigPath);

        // Convert the mcpServers object to an array for the API
        // Only include HTTP-based MCP servers (not local STDIO servers)
        const servers = [];
        for (const [key, serverConfig] of Object.entries(
          config.mcpServers || {}
        )) {
          if (serverConfig && typeof serverConfig === "object") {
            const configObj = serverConfig as any;

            // Only include URL-based servers for Anthropic MCP connector
            if (configObj.type === "url" && configObj.url) {
              servers.push({
                ...configObj,
                name: configObj.name || key,
              });
            }
            // Skip STDIO servers as they're not supported by Anthropic MCP connector
          }
        }

        return servers;
      }
    } catch (error) {
      console.error(
        chalk.yellow("Failed to load MCP servers configuration:"),
        error
      );
    }

    return [];
  }

  /**
   * Load custom rules
   */
  async loadCustomRules(): Promise<string> {
    try {
      const rulesPath = path.join(this.openagentDir, "rules.md");

      if (await fs.pathExists(rulesPath)) {
        const rules = await fs.readFile(rulesPath, "utf8");

        // Filter out empty lines and comments for the prompt
        const cleanedRules = rules
          .split("\n")
          .filter((line) => line.trim() && !line.trim().startsWith("#"))
          .join("\n")
          .trim();

        return cleanedRules;
      }
    } catch (error) {
      console.error(chalk.yellow("Failed to load custom rules:"), error);
    }

    return "";
  }

  /**
   * Update .gitignore to include .openagent/ folder
   */
  private async updateGitignore(): Promise<void> {
    try {
      const gitignorePath = path.join(this.projectPath, '.gitignore');
      const openagentEntry = '.openagent/';
      
      // Check if .gitignore exists
      if (await fs.pathExists(gitignorePath)) {
        const content = await fs.readFile(gitignorePath, 'utf-8');
        
        // Check if .openagent/ is already in .gitignore
        if (!content.includes(openagentEntry)) {
          // Add .openagent/ to .gitignore
          const updatedContent = content + '\n# OpenAgent local configuration\n' + openagentEntry + '\n';
          await fs.writeFile(gitignorePath, updatedContent);
        }
      } else {
        // Create .gitignore with .openagent/ entry
        const gitignoreContent = `# OpenAgent local configuration
.openagent/
`;
        await fs.writeFile(gitignorePath, gitignoreContent);
      }
    } catch (error) {
      // Silently fail - .gitignore is not critical for operation
      console.warn(chalk.yellow('Warning: Could not update .gitignore'));
    }
  }
}

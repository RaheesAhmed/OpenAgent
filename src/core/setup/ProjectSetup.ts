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
import { OpenAgentContext } from "../context/OpenAgentContext.js";

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
      await this.generateOpenAgentMD();
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
   * Generate OPENAGENT.MD file automatically during setup
   */
  private async generateOpenAgentMD(): Promise<void> {
    const openagentMdPath = path.join(this.projectPath, "OPENAGENT.MD");

    // Only create if it doesn't exist
    if (!(await fs.pathExists(openagentMdPath))) {
      try {
        console.log(chalk.dim("Generating OPENAGENT.MD file..."));
        
        const contextManager = new OpenAgentContext(this.projectPath);
        await contextManager.generateInitialContext(openagentMdPath);
        
        console.log(chalk.green("✅ Generated OPENAGENT.MD with project analysis"));
      } catch (error) {
        console.warn(chalk.yellow("Warning: Failed to generate OPENAGENT.MD:"), error);
        
        // Create a basic fallback file
        const fallbackContent = `# OPENAGENT.MD
*OpenAgent Project Context*

## Project Overview
Project: ${path.basename(this.projectPath)}

## Rules
- Follow project conventions
- Write clean, maintainable code
- Add appropriate documentation

## Instructions
Add your project-specific instructions here.
`;
        await fs.writeFile(openagentMdPath, fallbackContent, "utf8");
      }
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

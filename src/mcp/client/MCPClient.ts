/**
 * Copyright (c) 2025 OpenAgent Team
 * Licensed under the MIT License
 *
 * MCP Client for OpenAgent
 * Manages connections to various MCP servers including filesystem operations
 */

import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import path from "path";
import fs from "fs/promises";

export class MCPClientManager {
  private client: MultiServerMCPClient | null = null;
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Initialize MCP client with servers from .openagent/mcp-servers.json
   */
  async initialize(): Promise<void> {
    try {
      // Load MCP servers from configuration file
      const mcpServers = await this.loadMCPServersConfig();

      // Create and initialize MCP client with user's configured servers
      this.client = new MultiServerMCPClient({
        mcpServers,
      });

      // Silent initialization for cleaner user experience
      // MCP servers loaded successfully
    } catch (error) {
      console.error("❌ Failed to initialize MCP client:", error);
      throw error;
    }
  }

  /**
   * Load MCP servers from .openagent/mcp-servers.json
   * Supports any MCP server configuration the user wants
   */
  private async loadMCPServersConfig(): Promise<Record<string, any>> {
    const configPath = path.join(
      this.projectPath,
      ".openagent",
      "mcp-servers.json"
    );

    try {
      const configContent = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(configContent);

      const mcpServers: Record<string, any> = {};

      // Process each server from user's configuration
      for (const [serverName, serverConfig] of Object.entries(
        config.servers || {}
      )) {
        const server = serverConfig as any;

        // Only include enabled servers
        if (server.enabled !== false) {
          // Process variables in args (like {{projectPath}})
          const processedArgs =
            server.args?.map((arg: string) =>
              arg.replace("{{projectPath}}", this.projectPath)
            ) || [];

          mcpServers[serverName] = {
            command: server.command,
            args: processedArgs,
            transport: server.transport || "stdio",
            ...(server.env && { env: server.env }),
          };

          console.log(
            `📋 Loaded MCP server: ${serverName} - ${
              server.description || "No description"
            }`
          );
        } else {
          console.log(`⚪ Skipped disabled MCP server: ${serverName}`);
        }
      }

      // Fallback to default filesystem server if no servers configured
      if (Object.keys(mcpServers).length === 0) {
        console.log(
          "⚠️  No enabled MCP servers found, using default filesystem server"
        );
        mcpServers["filesystem"] = {
          command: "npx",
          args: [
            "-y",
            "@modelcontextprotocol/server-filesystem",
            this.projectPath,
          ],
          transport: "stdio",
        };
      }

      return mcpServers;
    } catch (error) {
      console.log(
        "⚠️  Could not load MCP configuration, using default filesystem server"
      );
      console.log(`   Config path: ${configPath}`);

      // Fallback configuration
      return {
        filesystem: {
          command: "npx",
          args: [
            "-y",
            "@modelcontextprotocol/server-filesystem",
            this.projectPath,
          ],
          transport: "stdio",
        },
      };
    }
  }

  /**
   * Get all available tools from MCP servers
   */
  async getTools() {
    if (!this.client) {
      throw new Error("MCP client not initialized. Call initialize() first.");
    }

    try {
      const tools = await this.client.getTools();
      // Tools loaded successfully - silent for clean UX
      return tools;
    } catch (error) {
      console.error("❌ Failed to get MCP tools:", error);
      throw error;
    }
  }

  /**
   * Close MCP client connections
   */
  async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        this.client = null;
        console.log("✅ MCP client connections closed");
      } catch (error) {
        console.error("❌ Error closing MCP client:", error);
      }
    }
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.client !== null;
  }

  /**
   * Get the MCP client instance (for advanced usage)
   */
  getClient(): MultiServerMCPClient | null {
    return this.client;
  }
}

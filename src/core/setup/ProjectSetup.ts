import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

/**
 * OpenClaude Project Setup
 * Creates .openclaude folder and configuration files
 */
export class ProjectSetup {
  private openclaudeDir: string;

  constructor(projectPath: string) {
    this.openclaudeDir = path.join(projectPath, '.openclaude');
  }

  /**
   * Initialize OpenClaude project structure
   */
  async initialize(): Promise<void> {
    try {
      // Check if this is first time setup BEFORE creating directory
      const isFirstTime = !(await fs.pathExists(this.openclaudeDir));
      
      await this.createOpenClaudeDirectory();
      await this.createMcpServersConfig();
      await this.createRulesFile();
      
      // Show success message only if this was the first time setup
      if (isFirstTime) {
        console.log(chalk.dim('OpenClaude project initialized in .openclaude/'));
      }
    } catch (error) {
      console.error(chalk.red('Failed to initialize OpenClaude project:'), error);
    }
  }

  /**
   * Create .openclaude directory
   */
  private async createOpenClaudeDirectory(): Promise<void> {
    await fs.ensureDir(this.openclaudeDir);
  }

  /**
   * Create mcp-servers.json configuration file
   */
  private async createMcpServersConfig(): Promise<void> {
    const mcpConfigPath = path.join(this.openclaudeDir, 'mcp-servers.json');
    
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
        }
      };
      
      await fs.writeJson(mcpConfigPath, defaultConfig, { spaces: 2 });
    }
  }

  /**
   * Create rules.md file
   */
  private async createRulesFile(): Promise<void> {
    const rulesPath = path.join(this.openclaudeDir, 'rules.md');
    
    // Only create if it doesn't exist
    if (!(await fs.pathExists(rulesPath))) {
      const defaultRules = `# OpenClaude Project Rules

Add your custom rules and guidelines for this project here.

## Example Rules:

- Always use TypeScript for new files
- Follow the existing code style and patterns
- Write tests for new functionality
- Use meaningful variable and function names
- Add comments for complex logic

## Custom Instructions:

You can add specific instructions for your project here that OpenClaude should follow.

## MCP Server Configuration:

Edit the mcp-servers.json file to add MCP servers for additional tools and capabilities.
`;

      await fs.writeFile(rulesPath, defaultRules, 'utf8');
    }
  }

  /**
   * Load MCP servers configuration
   */
  async loadMcpServers(): Promise<any[]> {
    try {
      const mcpConfigPath = path.join(this.openclaudeDir, 'mcp-servers.json');
      
      if (await fs.pathExists(mcpConfigPath)) {
        const config = await fs.readJson(mcpConfigPath);
        
        // Convert the mcpServers object to an array for the API
        // Only include HTTP-based MCP servers (not local STDIO servers)
        const servers = [];
        for (const [key, serverConfig] of Object.entries(config.mcpServers || {})) {
          if (serverConfig && typeof serverConfig === 'object') {
            const configObj = serverConfig as any;
            
            // Only include URL-based servers for Anthropic MCP connector
            if (configObj.type === 'url' && configObj.url) {
              servers.push({
                ...configObj,
                name: configObj.name || key
              });
            }
            // Skip STDIO servers as they're not supported by Anthropic MCP connector
          }
        }
        
        return servers;
      }
    } catch (error) {
      console.error(chalk.yellow('Failed to load MCP servers configuration:'), error);
    }
    
    return [];
  }

  /**
   * Load custom rules
   */
  async loadCustomRules(): Promise<string> {
    try {
      const rulesPath = path.join(this.openclaudeDir, 'rules.md');
      
      if (await fs.pathExists(rulesPath)) {
        const rules = await fs.readFile(rulesPath, 'utf8');
        
        // Filter out empty lines and comments for the prompt
        const cleanedRules = rules
          .split('\n')
          .filter(line => line.trim() && !line.trim().startsWith('#'))
          .join('\n')
          .trim();
        
        return cleanedRules;
      }
    } catch (error) {
      console.error(chalk.yellow('Failed to load custom rules:'), error);
    }
    
    return '';
  }
}

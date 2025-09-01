/**
 * MCP Server Configuration Types
 */

export interface MCPServerConfig {
  description: string;
  command: string;
  args: string[];
  transport: 'stdio' | 'sse';
  enabled: boolean;
  env?: Record<string, string>;
}

export interface MCPServersConfig {
  servers: Record<string, MCPServerConfig>;
  variables?: Record<string, string>;
  settings?: {
    maxConcurrentServers?: number;
    connectionTimeout?: number;
    retryAttempts?: number;
    enableLogging?: boolean;
  };
}

export interface ProcessedMCPServerConfig {
  command: string;
  args: string[];
  transport: 'stdio' | 'sse';
  env?: Record<string, string>;
}
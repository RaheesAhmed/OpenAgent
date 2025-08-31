/**
 * Core agent interfaces and types for OpenClaude
 * Based on Anthropic's agent architecture patterns
 */

export interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{
    type: 'text' | 'tool_use' | 'tool_result';
    text?: string;
    tool_use_id?: string;
    name?: string;
    input?: any;
    content?: string;
    is_error?: boolean;
  }>;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  model: string;
  systemPrompt: string;
  tools: Tool[];
  capabilities: AgentCapability[];
  maxTokens: number;
  temperature: number;
  metadata: AgentMetadata;
}

export interface AgentCapability {
  name: string;
  description: string;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface AgentMetadata {
  category: 'development' | 'analysis' | 'research' | 'support' | 'custom';
  tags: string[];
  author: string;
  version: string;
  created: Date;
  updated: Date;
  usage: {
    totalCalls: number;
    successRate: number;
    avgResponseTime: number;
  };
}

export interface AgentContext {
  projectPath: string;
  workingDirectory: string;
  memory: AgentMemory;
  session: AgentSession;
  environment: AgentEnvironment;
}

export interface AgentMemory {
  shortTerm: Map<string, any>;
  longTerm: Map<string, any>;
  patterns: PatternMemory[];
  userPreferences: Record<string, any>;
  projectKnowledge: ProjectKnowledge;
}

export interface PatternMemory {
  pattern: string;
  frequency: number;
  success: number;
  context: string;
  lastUsed: Date;
}

export interface ProjectKnowledge {
  structure: FileStructure;
  dependencies: DependencyMap;
  technologies: Technology[];
  conventions: CodingConvention[];
  documentation: DocumentationIndex;
}

export interface FileStructure {
  root: string;
  directories: DirectoryNode[];
  files: FileNode[];
  ignored: string[];
}

export interface DirectoryNode {
  path: string;
  name: string;
  children: (DirectoryNode | FileNode)[];
}

export interface FileNode {
  path: string;
  name: string;
  extension: string;
  size: number;
  modified: Date;
  type: 'source' | 'config' | 'documentation' | 'asset' | 'test';
}

export interface DependencyMap {
  production: Dependency[];
  development: Dependency[];
  peer: Dependency[];
  optional: Dependency[];
}

export interface Dependency {
  name: string;
  version: string;
  type: 'npm' | 'python' | 'rust' | 'go' | 'java' | 'other';
  description?: string;
  homepage?: string;
}

export interface Technology {
  name: string;
  category: 'language' | 'framework' | 'library' | 'tool' | 'platform';
  version?: string;
  confidence: number;
}

export interface CodingConvention {
  type: 'naming' | 'formatting' | 'structure' | 'documentation';
  rule: string;
  examples: string[];
  confidence: number;
}

export interface DocumentationIndex {
  readme: string[];
  api: string[];
  guides: string[];
  examples: string[];
  external: ExternalDoc[];
}

export interface ExternalDoc {
  name: string;
  url: string;
  type: 'official' | 'community' | 'tutorial' | 'reference';
  relevance: number;
}

export interface AgentSession {
  id: string;
  startTime: Date;
  lastActivity: Date;
  messageHistory: AgentMessage[];
  currentTask?: string;
  goals: string[];
  achievements: string[];
}

export interface AgentEnvironment {
  os: string;
  shell: string;
  editor: string;
  nodeVersion?: string;
  pythonVersion?: string;
  gitBranch?: string;
  dockerRunning: boolean;
  availableTools: string[];
}

export interface AgentResponse {
  success: boolean;
  content: string;
  toolUses: ToolUse[];
  metadata: ResponseMetadata;
  suggestions?: string[];
  nextSteps?: string[];
}

export interface ToolUse {
  id: string;
  name: string;
  input: any;
  output?: any;
  error?: string;
  duration: number;
}

export interface ResponseMetadata {
  modelUsed: string;
  tokensUsed: {
    input: number;
    output: number;
    cached: number;
  };
  responseTime: number;
  confidence: number;
  reasoning?: string;
}

export interface AgentPerformance {
  totalRequests: number;
  successfulRequests: number;
  averageResponseTime: number;
  tokenEfficiency: number;
  userSatisfaction: number;
  errorRate: number;
  lastEvaluated: Date;
}

export interface AgentWorkflow {
  type: 'prompt_chaining' | 'routing' | 'parallelization' | 'orchestrator_workers' | 'evaluator_optimizer';
  steps: WorkflowStep[];
  parallelizable: boolean;
  dependencies: string[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'analysis' | 'execution' | 'validation' | 'synthesis';
  agent?: string;
  tools: string[];
  inputs: string[];
  outputs: string[];
  timeout: number;
}

export type AgentEvent = {
  type: 'started' | 'completed' | 'error' | 'tool_used' | 'memory_updated';
  agentId: string;
  timestamp: Date;
  data: any;
  severity: 'info' | 'warning' | 'error';
};

export type AgentStatus = 'idle' | 'working' | 'waiting' | 'error' | 'disabled';

export interface AgentHealth {
  status: AgentStatus;
  uptime: number;
  memoryUsage: number;
  responseTime: number;
  errorCount: number;
  lastError?: Error;
  lastHealthCheck: Date;
}

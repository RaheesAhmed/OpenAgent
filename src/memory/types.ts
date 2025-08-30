/**
 * Memory system types and interfaces for OpenClaude
 * Implementing persistent, never-forget memory with vector search
 */

export interface MemoryConfig {
  databasePath: string;
  vectorDimensions: number;
  maxMemorySize: number;
  compressionEnabled: boolean;
  vectorSearchThreshold: number;
  retentionPolicy: RetentionPolicy;
}

export interface RetentionPolicy {
  shortTermDays: number;
  longTermDays: number;
  archiveAfterDays: number;
  neverDeleteImportant: boolean;
}

export interface MemoryRecord {
  id: string;
  type: MemoryType;
  content: string;
  metadata: MemoryMetadata;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
  lastAccessed: Date;
  accessCount: number;
  importance: number;
  tags: string[];
  associatedFiles: string[];
  sessionId: string;
  projectId: string;
}

export enum MemoryType {
  CONVERSATION = 'conversation',
  CODE_PATTERN = 'code_pattern',
  PROJECT_STRUCTURE = 'project_structure',
  USER_PREFERENCE = 'user_preference',
  LEARNED_BEHAVIOR = 'learned_behavior',
  ERROR_RESOLUTION = 'error_resolution',
  TOOL_USAGE = 'tool_usage',
  ARCHITECTURAL_DECISION = 'architectural_decision',
  DEPENDENCY_INFO = 'dependency_info',
  DOCUMENTATION = 'documentation',
  BEST_PRACTICE = 'best_practice',
  OPTIMIZATION = 'optimization'
}

export interface MemoryMetadata {
  source: string;
  confidence: number;
  relevance: number;
  context: Record<string, any>;
  relationships: MemoryRelationship[];
  checksum?: string;
}

export interface MemoryRelationship {
  targetId: string;
  type: RelationshipType;
  strength: number;
  metadata?: Record<string, any>;
}

export enum RelationshipType {
  SIMILAR = 'similar',
  DEPENDENT = 'dependent',
  CONFLICTS = 'conflicts',
  EXTENDS = 'extends',
  IMPLEMENTS = 'implements',
  USES = 'uses',
  RELATED = 'related'
}

export interface MemoryQuery {
  text?: string;
  type?: MemoryType;
  tags?: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  projectId?: string;
  sessionId?: string;
  minImportance?: number;
  maxResults?: number;
  similarityThreshold?: number;
  includeArchived?: boolean;
}

export interface MemorySearchResult {
  record: MemoryRecord;
  score: number;
  explanation: string;
  relatedRecords: MemoryRecord[];
}

export interface MemoryStats {
  totalRecords: number;
  recordsByType: Record<MemoryType, number>;
  storageUsed: number;
  avgImportance: number;
  mostAccessedRecords: MemoryRecord[];
  recentlyCreated: MemoryRecord[];
  memoryHealth: MemoryHealthStatus;
}

export interface MemoryHealthStatus {
  status: 'healthy' | 'degraded' | 'critical';
  issues: string[];
  recommendations: string[];
  lastCheckup: Date;
}

export interface MemoryContext {
  currentProject: string;
  currentSession: string;
  workingDirectory: string;
  activeFiles: string[];
  userFocus: string[];
  temporaryContext: Map<string, any>;
}

export interface LearningPattern {
  id: string;
  pattern: string;
  category: string;
  frequency: number;
  successRate: number;
  lastReinforced: Date;
  context: Record<string, any>;
  examples: string[];
  confidence: number;
}

export interface UserBehaviorProfile {
  codingStyle: CodingStylePreferences;
  workflowPatterns: WorkflowPattern[];
  communicationStyle: CommunicationPreferences;
  toolPreferences: ToolPreferences;
  learningSpeed: number;
  expertiseAreas: ExpertiseArea[];
}

export interface CodingStylePreferences {
  indentation: 'spaces' | 'tabs';
  indentSize: number;
  quotes: 'single' | 'double';
  semicolons: boolean;
  bracketStyle: 'same-line' | 'new-line';
  namingConvention: 'camelCase' | 'snake_case' | 'kebab-case' | 'PascalCase';
  commentStyle: 'verbose' | 'minimal' | 'moderate';
  errorHandling: 'try-catch' | 'error-first' | 'functional';
}

export interface WorkflowPattern {
  name: string;
  steps: string[];
  frequency: number;
  successRate: number;
  timeToComplete: number;
  triggers: string[];
}

export interface CommunicationPreferences {
  verbosity: 'brief' | 'detailed' | 'comprehensive';
  technicalLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  explanationStyle: 'step-by-step' | 'conceptual' | 'example-based';
  feedbackFrequency: 'high' | 'medium' | 'low';
}

export interface ToolPreferences {
  preferredEditor: string;
  preferredTerminal: string;
  preferredPackageManager: string;
  buildTools: string[];
  testingFrameworks: string[];
  deploymentPreferences: string[];
}

export interface ExpertiseArea {
  domain: string;
  level: number; // 1-10 scale
  confidence: number;
  lastAssessed: Date;
  growthRate: number;
}

export interface MemoryOptimization {
  compressionRatio: number;
  deduplicationSavings: number;
  indexOptimization: number;
  cacheHitRate: number;
  averageRetrievalTime: number;
}

/**
 * Copyright (c) 2025 OpenAgent Team
 * Licensed under the MIT License
 * 
 * Tools Index - Export all available tools for agents
 */

// File system tools - Real filesystem operations (different names to avoid Deep Agents conflicts)
export {
  createRealFileTool,
  readRealFileTool,
  updateRealFileTool,
  listRealDirectoryTool,
  createRealDirectoryTool,
  allFileTools
} from './fileTools.js';

// Project analysis tools
export {
  analyzeProjectTool,
  getFileInfoTool,
  getFileDependenciesTool,
  getFileDependentsTool,
  getFolderContentsTool,
  getProjectOverviewTool,
  getRelatedFilesTool,
  findFilesByExportTool,
  findFilesByImportTool,
  clearProjectCacheTool,
  allProjectTools,
  type ProjectAnalysisResult,
  type FileInfoResult,
  type DependencyResult,
  type FolderContentsResult,
  type RelatedFilesResult
} from './projectTools.js';

// OpenAgent context tools
export {
  initContextTool,
  addContextInstructionTool,
  getProjectContextTool,
  getPathContextTool,
  updateContextFileTool,
  allContextTools,
  type OpenAgentContextParams,
  type ContextResult,
  type ContextError
} from './openAgentContextTool.js';

// Terminal/execution tools
export * from './terminal.js';

// Combined tool arrays for easy registration
import { allFileTools } from './fileTools.js';
import { allProjectTools } from './projectTools.js';
import { allContextTools } from './openAgentContextTool.js';

export const allTools = [
  ...allFileTools,
  ...allProjectTools,
  ...allContextTools
];

// Tool categories for organization
export const toolCategories = {
  filesystem: allFileTools,
  project: allProjectTools,
  context: allContextTools,
  all: allTools
};

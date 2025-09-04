/**
 * Copyright (c) 2025 OpenAgent Team
 * Licensed under the MIT License
 * 
 * Tools Index - Export all available tools for agents
 */

// File system tools
export {
  readFileTool,
  writeFileTool,
  listDirectoryTool,
  createDirectoryTool,
  deleteTool,
  moveTool,
  searchFilesTool,
  allFileTools,
  type FileReadResult,
  type FileWriteResult,
  type DirectoryItem,
  type ListDirectoryResult,
  type SearchResult
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

// Terminal/execution tools
export * from './terminal.js';

// Combined tool arrays for easy registration
import { allFileTools } from './fileTools.js';
import { allProjectTools } from './projectTools.js';

export const allTools = [
  ...allFileTools,
  ...allProjectTools
];

// Tool categories for organization
export const toolCategories = {
  filesystem: allFileTools,
  project: allProjectTools,
  all: allTools
};

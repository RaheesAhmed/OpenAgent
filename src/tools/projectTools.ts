/**
 * Copyright (c) 2025 OpenAgent Team
 * Licensed under the MIT License
 * 
 * Project Analysis Tools - Dynamic dependency graphs and file relationships
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ProjectAnalyzer, FileNode } from "../core/context/ProjectAnalyzer.js";

// Global project analyzer instance with caching
let projectAnalyzer: ProjectAnalyzer | null = null;
let currentProjectRoot: string | null = null;

// Initialize or get existing project analyzer
function getProjectAnalyzer(projectPath: string): ProjectAnalyzer {
  if (!projectAnalyzer || currentProjectRoot !== projectPath) {
    projectAnalyzer = new ProjectAnalyzer(projectPath);
    currentProjectRoot = projectPath;
  }
  return projectAnalyzer;
}

// Type Definitions for Results
interface ProjectAnalysisResult {
  success: true;
  projectPath: string;
  totalFiles: number;
  dependenciesCount: number;
  summary: string;
  analysisTime: number;
}

interface ProjectAnalysisError {
  success: false;
  error: string;
  projectPath: string;
}

interface FileInfoResult {
  success: true;
  filePath: string;
  fileNode: FileNode;
}

interface FileInfoError {
  success: false;
  error: string;
  filePath: string;
}

interface DependencyResult {
  success: true;
  filePath: string;
  dependencies: string[];
  count: number;
}

interface DependencyError {
  success: false;
  error: string;
  filePath: string;
}

interface FolderContentsResult {
  success: true;
  folderPath: string;
  contents: FileNode[];
  count: number;
}

interface FolderContentsError {
  success: false;
  error: string;
  folderPath: string;
}

interface RelatedFilesResult {
  success: true;
  filePath: string;
  relatedFiles: string[];
  count: number;
}

interface RelatedFilesError {
  success: false;
  error: string;
  filePath: string;
}

// Analyze Project Structure Tool
export const analyzeProjectTool = tool(
  async (input) => {
    const { projectPath = process.cwd() } = input as {
      projectPath?: string;
    };
    
    try {
      const startTime = Date.now();
      const analyzer = getProjectAnalyzer(projectPath);
      const structure = await analyzer.analyze();
      const analysisTime = Date.now() - startTime;

      return {
        success: true,
        projectPath,
        totalFiles: structure.totalFiles,
        dependenciesCount: Object.keys(structure.dependencies).length,
        summary: structure.summary,
        analysisTime
      } as ProjectAnalysisResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        projectPath
      } as ProjectAnalysisError;
    }
  },
  {
    name: "analyze_project",
    description: "Analyze project structure, build dependency graph, and get project overview",
    schema: zodToJsonSchema(z.object({
      projectPath: z.string().optional().describe("Path to the project root directory (defaults to current directory)")
    }))
  }
);

// Get File Info Tool
export const getFileInfoTool = tool(
  async (input) => {
    const { filePath, projectPath = process.cwd() } = input as {
      filePath: string;
      projectPath?: string;
    };
    
    try {
      const analyzer = getProjectAnalyzer(projectPath);
      const fileNode = await analyzer.getFileInfo(filePath);
      
      if (!fileNode) {
        return {
          success: false,
          error: `File not found or not analyzed: ${filePath}`,
          filePath
        } as FileInfoError;
      }

      return {
        success: true,
        filePath,
        fileNode
      } as FileInfoResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        filePath
      } as FileInfoError;
    }
  },
  {
    name: "get_file_info",
    description: "Get detailed information about a specific file including exports, imports, and metadata",
    schema: zodToJsonSchema(z.object({
      filePath: z.string().describe("Relative path to the file from project root"),
      projectPath: z.string().optional().describe("Path to the project root directory")
    }))
  }
);

// Get File Dependencies Tool
export const getFileDependenciesTool = tool(
  async (input) => {
    const { filePath, projectPath = process.cwd() } = input as {
      filePath: string;
      projectPath?: string;
    };
    
    try {
      const analyzer = getProjectAnalyzer(projectPath);
      const dependencies = await analyzer.getFileDependencies(filePath);

      return {
        success: true,
        filePath,
        dependencies,
        count: dependencies.length
      } as DependencyResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        filePath
      } as DependencyError;
    }
  },
  {
    name: "get_file_dependencies",
    description: "Get all files that a specific file depends on (imports)",
    schema: zodToJsonSchema(z.object({
      filePath: z.string().describe("Relative path to the file from project root"),
      projectPath: z.string().optional().describe("Path to the project root directory")
    }))
  }
);

// Get File Dependents Tool
export const getFileDependentsTool = tool(
  async (input) => {
    const { filePath, projectPath = process.cwd() } = input as {
      filePath: string;
      projectPath?: string;
    };
    
    try {
      const analyzer = getProjectAnalyzer(projectPath);
      const dependents = await analyzer.getFileDependents(filePath);

      return {
        success: true,
        filePath,
        dependencies: dependents,
        count: dependents.length
      } as DependencyResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        filePath
      } as DependencyError;
    }
  },
  {
    name: "get_file_dependents",
    description: "Get all files that depend on a specific file (files that import this file)",
    schema: zodToJsonSchema(z.object({
      filePath: z.string().describe("Relative path to the file from project root"),
      projectPath: z.string().optional().describe("Path to the project root directory")
    }))
  }
);

// Get Folder Contents Tool
export const getFolderContentsTool = tool(
  async (input) => {
    const { folderPath, projectPath = process.cwd() } = input as {
      folderPath: string;
      projectPath?: string;
    };
    
    try {
      const analyzer = getProjectAnalyzer(projectPath);
      const contents = await analyzer.getFolderContents(folderPath);

      return {
        success: true,
        folderPath,
        contents,
        count: contents.length
      } as FolderContentsResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        folderPath
      } as FolderContentsError;
    }
  },
  {
    name: "get_folder_contents",
    description: "Get detailed contents of a folder including file metadata and structure",
    schema: zodToJsonSchema(z.object({
      folderPath: z.string().describe("Relative path to the folder from project root (use '' for project root)"),
      projectPath: z.string().optional().describe("Path to the project root directory")
    }))
  }
);

// Get Project Overview Tool
export const getProjectOverviewTool = tool(
  async (input) => {
    const { projectPath = process.cwd() } = input as {
      projectPath?: string;
    };
    
    try {
      const analyzer = getProjectAnalyzer(projectPath);
      const overview = await analyzer.getProjectOverview();

      return {
        success: true,
        projectPath,
        overview
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        projectPath
      };
    }
  },
  {
    name: "get_project_overview",
    description: "Get a high-level overview of the project including file counts, key files, and structure",
    schema: zodToJsonSchema(z.object({
      projectPath: z.string().optional().describe("Path to the project root directory")
    }))
  }
);

// Get Related Files Tool
export const getRelatedFilesTool = tool(
  async (input) => {
    const { filePath, projectPath = process.cwd() } = input as {
      filePath: string;
      projectPath?: string;
    };
    
    try {
      const analyzer = getProjectAnalyzer(projectPath);
      const relatedFiles = await analyzer.getRelatedFiles(filePath);

      return {
        success: true,
        filePath,
        relatedFiles,
        count: relatedFiles.length
      } as RelatedFilesResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        filePath
      } as RelatedFilesError;
    }
  },
  {
    name: "get_related_files",
    description: "Get all files related to a specific file (both dependencies and dependents)",
    schema: zodToJsonSchema(z.object({
      filePath: z.string().describe("Relative path to the file from project root"),
      projectPath: z.string().optional().describe("Path to the project root directory")
    }))
  }
);

// Find Files by Export Tool
export const findFilesByExportTool = tool(
  async (input) => {
    const { exportName, projectPath = process.cwd() } = input as {
      exportName: string;
      projectPath?: string;
    };
    
    try {
      const analyzer = getProjectAnalyzer(projectPath);
      await analyzer.analyze(); // Ensure project is analyzed
      
      // This is a custom search through the structure
      const structure = await analyzer.analyze();
      const results: { filePath: string; exports: string[] }[] = [];
      
      // Search through all files in the dependency graph
      for (const [filePath, info] of Object.entries(structure.dependencies)) {
        if (info.exports.includes(exportName)) {
          results.push({
            filePath,
            exports: info.exports
          });
        }
      }

      return {
        success: true,
        exportName,
        results,
        count: results.length
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        exportName
      };
    }
  },
  {
    name: "find_files_by_export",
    description: "Find all files that export a specific function, class, or variable",
    schema: zodToJsonSchema(z.object({
      exportName: z.string().describe("Name of the export to search for"),
      projectPath: z.string().optional().describe("Path to the project root directory")
    }))
  }
);

// Find Files by Import Tool
export const findFilesByImportTool = tool(
  async (input) => {
    const { moduleName, projectPath = process.cwd() } = input as {
      moduleName: string;
      projectPath?: string;
    };
    
    try {
      const analyzer = getProjectAnalyzer(projectPath);
      await analyzer.analyze(); // Ensure project is analyzed
      
      const structure = await analyzer.analyze();
      const results: { filePath: string; imports: string[] }[] = [];
      
      // Search through all files in the dependency graph
      for (const [filePath, info] of Object.entries(structure.dependencies)) {
        const hasImport = info.imports.some(imp => 
          imp.includes(moduleName) || imp === moduleName
        );
        
        if (hasImport) {
          results.push({
            filePath,
            imports: info.imports
          });
        }
      }

      return {
        success: true,
        moduleName,
        results,
        count: results.length
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        moduleName
      };
    }
  },
  {
    name: "find_files_by_import",
    description: "Find all files that import from a specific module",
    schema: zodToJsonSchema(z.object({
      moduleName: z.string().describe("Name of the module to search for"),
      projectPath: z.string().optional().describe("Path to the project root directory")
    }))
  }
);

// Clear Project Cache Tool
export const clearProjectCacheTool = tool(
  async (input) => {
    const { projectPath = process.cwd() } = input as {
      projectPath?: string;
    };
    
    try {
      // Reset the global cache
      projectAnalyzer = null;
      currentProjectRoot = null;

      return {
        success: true,
        message: "Project cache cleared successfully",
        projectPath
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        projectPath
      };
    }
  },
  {
    name: "clear_project_cache",
    description: "Clear the project analysis cache to force re-analysis on next request",
    schema: zodToJsonSchema(z.object({
      projectPath: z.string().optional().describe("Path to the project root directory")
    }))
  }
);

// Export all project tools as an array for easy registration
export const allProjectTools = [
  analyzeProjectTool,
  getFileInfoTool,
  getFileDependenciesTool,
  getFileDependentsTool,
  getFolderContentsTool,
  getProjectOverviewTool,
  getRelatedFilesTool,
  findFilesByExportTool,
  findFilesByImportTool,
  clearProjectCacheTool
];

// Export type definitions for external use
export type {
  ProjectAnalysisResult,
  ProjectAnalysisError,
  FileInfoResult,
  FileInfoError,
  DependencyResult,
  DependencyError,
  FolderContentsResult,
  FolderContentsError,
  RelatedFilesResult,
  RelatedFilesError
};

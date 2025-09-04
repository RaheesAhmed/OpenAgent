/**
 * Copyright (c) 2025 OpenAgent Team
 * Licensed under the MIT License
 * 
 * OpenAgent Context Tool - CLI tool for managing OPENAGENT.MD files
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { OpenAgentContext } from '../core/context/OpenAgentContext.js';

// Type definitions
export interface OpenAgentContextParams {
  action: 'init' | 'add' | 'get' | 'update' | 'path';
  projectPath?: string;
  instruction?: string;
  section?: string;
  targetPath?: string;
  content?: string;
}

interface ContextResult {
  success: true;
  action: string;
  message: string;
  data?: string;
}

interface ContextError {
  success: false;
  action: string;
  error: string;
}

// Context cache for reusing instances
const contextCache = new Map<string, OpenAgentContext>();

// Helper function to get or create context instance
function getContext(projectPath: string): OpenAgentContext {
  if (!contextCache.has(projectPath)) {
    contextCache.set(projectPath, new OpenAgentContext(projectPath));
  }
  return contextCache.get(projectPath)!;
}

// Initialize OpenAgent context
export const initContextTool = tool(
  async (input) => {
    const { projectPath = process.cwd() } = input as { projectPath?: string };
    
    try {
      const context = getContext(projectPath);
      const contextContent = await context.generateInitialContext();
      
      return {
        success: true,
        action: 'init',
        message: 'Generated OPENAGENT.MD file with comprehensive project context',
        data: contextContent.substring(0, 500) + '...'
      };
    } catch (error) {
      return {
        success: false,
        action: 'init',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },
  {
    name: "init_openagent_context",
    description: "Initialize OpenAgent project context by generating OPENAGENT.MD file",
    schema: zodToJsonSchema(z.object({
      projectPath: z.string().optional().describe("Path to project directory (defaults to current directory)")
    }))
  }
);

// Add instruction to context
export const addContextInstructionTool = tool(
  async (input) => {
    const { 
      instruction,
      section = 'rules',
      projectPath = process.cwd()
    } = input as { 
      instruction: string;
      section?: string;
      projectPath?: string;
    };
    
    try {
      const context = getContext(projectPath);
      await context.addInstruction(instruction, section);
      
      return {
        success: true,
        action: 'add',
        message: `Added instruction to ${section}: "${instruction}"`
      };
    } catch (error) {
      return {
        success: false,
        action: 'add',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },
  {
    name: "add_context_instruction",
    description: "Add new instruction to OpenAgent context file",
    schema: zodToJsonSchema(z.object({
      instruction: z.string().describe("Instruction to add to context"),
      section: z.string().optional().describe("Section to add instruction to (default: rules)"),
      projectPath: z.string().optional().describe("Path to project directory")
    }))
  }
);

// Get project context
export const getProjectContextTool = tool(
  async (input) => {
    const { projectPath = process.cwd() } = input as { projectPath?: string };
    
    try {
      const context = getContext(projectPath);
      const projectContext = await context.getProjectContext();
      
      return {
        success: true,
        action: 'get',
        message: 'Retrieved project context',
        data: projectContext
      };
    } catch (error) {
      return {
        success: false,
        action: 'get',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },
  {
    name: "get_project_context",
    description: "Get the current project context from OPENAGENT.MD files",
    schema: zodToJsonSchema(z.object({
      projectPath: z.string().optional().describe("Path to project directory")
    }))
  }
);

// Get context for specific path
export const getPathContextTool = tool(
  async (input) => {
    const { 
      targetPath,
      projectPath = process.cwd()
    } = input as { 
      targetPath: string;
      projectPath?: string;
    };
    
    try {
      const context = getContext(projectPath);
      const pathContext = await context.getContextForPath(targetPath);
      
      return {
        success: true,
        action: 'path',
        message: `Retrieved context for ${targetPath}`,
        data: pathContext
      };
    } catch (error) {
      return {
        success: false,
        action: 'path',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },
  {
    name: "get_path_context",
    description: "Get context for a specific file or directory path",
    schema: zodToJsonSchema(z.object({
      targetPath: z.string().describe("Path to get context for"),
      projectPath: z.string().optional().describe("Path to project directory")
    }))
  }
);

// Update context file
export const updateContextFileTool = tool(
  async (input) => {
    const { 
      targetPath,
      content,
      projectPath = process.cwd()
    } = input as { 
      targetPath: string;
      content: string;
      projectPath?: string;
    };
    
    try {
      const context = getContext(projectPath);
      await context.updateContext(targetPath, content);
      
      return {
        success: true,
        action: 'update',
        message: `Updated context file: ${targetPath}`
      };
    } catch (error) {
      return {
        success: false,
        action: 'update',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },
  {
    name: "update_context_file",
    description: "Update an OpenAgent context file with new content",
    schema: zodToJsonSchema(z.object({
      targetPath: z.string().describe("Path to context file to update"),
      content: z.string().describe("New content for the context file"),
      projectPath: z.string().optional().describe("Path to project directory")
    }))
  }
);

// Export all context tools
export const allContextTools = [
  initContextTool,
  addContextInstructionTool,
  getProjectContextTool,
  getPathContextTool,
  updateContextFileTool
];

// Export type definitions
export type {
  ContextResult,
  ContextError
};

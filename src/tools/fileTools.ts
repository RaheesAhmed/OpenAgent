
// File system operations, project management, and workspace tools

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import fs from "fs/promises";
import path from "path";

// Type Definitions
interface FileReadResult {
  success: true;
  content: string;
  filePath: string;
  size: number;
  lastModified: Date;
  encoding: string;
}

interface FileReadError {
  success: false;
  error: string;
  filePath: string;
}

interface FileWriteResult {
  success: true;
  filePath: string;
  size: number;
  created: boolean;
}

interface FileWriteError {
  success: false;
  error: string;
  filePath: string;
}

interface DirectoryItem {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number | undefined;
  lastModified: Date;
  extension?: string | undefined;
}

interface ListDirectoryResult {
  success: true;
  directoryPath: string;
  items: DirectoryItem[];
  count: number;
}

interface ListDirectoryError {
  success: false;
  error: string;
  directoryPath: string;
}

interface CreateDirectoryResult {
  success: true;
  directoryPath: string;
  created: boolean;
}

interface CreateDirectoryError {
  success: false;
  error: string;
  directoryPath: string;
}

interface DeleteResult {
  success: true;
  targetPath: string;
  deleted: boolean;
  type: "file" | "directory";
}

interface DeleteError {
  success: false;
  error: string;
  targetPath: string;
}

interface MoveResult {
  success: true;
  sourcePath: string;
  destinationPath: string;
  moved: boolean;
}

interface MoveError {
  success: false;
  error: string;
  sourcePath: string;
  destinationPath: string;
}

interface SearchResult {
  name: string;
  path: string;
  size: number;
  lastModified: Date;
  extension: string;
}

interface SearchFilesResult {
  success: true;
  searchPath: string;
  pattern: string;
  results: SearchResult[];
  count: number;
}

interface SearchFilesError {
  success: false;
  error: string;
  searchPath: string;
  pattern: string;
}

// Read File Tool
export const readFileTool = tool(
  async (input) => {
    const { filePath, encoding = "utf8" } = input as {
      filePath: string;
      encoding?: string;
    };
    try {
      const content = await fs.readFile(filePath, encoding as BufferEncoding);
      const stats = await fs.stat(filePath);

      return {
        success: true,
        content: content,
        filePath: filePath,
        size: stats.size,
        lastModified: stats.mtime,
        encoding: encoding,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        filePath: filePath,
      };
    }
  },
  {
    name: "read_file",
    description: "Read the contents of a file",
    schema: zodToJsonSchema(z.object({
      filePath: z.string().describe("Path to the file to read"),
      encoding: z
        .string()
        .optional()
        .describe("File encoding (utf8, binary, etc.)"),
    })),
  }
);

// Write File Tool
export const writeFileTool = tool(
  async (input) => {
    const {
      filePath,
      content,
      encoding = "utf8",
      createDirectories = true,
    } = input as {
      filePath: string;
      content: string;
      encoding?: string;
      createDirectories?: boolean;
    };
    try {
      if (createDirectories) {
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
      }

      await fs.writeFile(filePath, content, encoding as BufferEncoding);
      const stats = await fs.stat(filePath);

      return {
        success: true,
        filePath: filePath,
        size: stats.size,
        created: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        filePath: filePath,
      };
    }
  },
  {
    name: "write_file",
    description: "Write content to a file, creating directories if needed",
    schema: zodToJsonSchema(z.object({
      filePath: z.string().describe("Path where to write the file"),
      content: z.string().describe("Content to write to the file"),
      encoding: z
        .string()
        .optional()
        .describe("File encoding (utf8, binary, etc.)"),
      createDirectories: z
        .boolean()
        .optional()
        .describe("Create parent directories if they do not exist"),
    })),
  }
);

// List Directory Tool
export const listDirectoryTool = tool(
  async (input) => {
    const { directoryPath, recursive = false, includeHidden = false } = input as {
      directoryPath: string;
      recursive?: boolean;
      includeHidden?: boolean;
    };
    try {
      const items = await readDirectory(
        directoryPath,
        recursive,
        includeHidden
      );

      return {
        success: true,
        directoryPath: directoryPath,
        items: items,
        count: items.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        directoryPath: directoryPath,
      };
    }
  },
  {
    name: "list_directory",
    description: "List files and directories in a given path",
    schema: zodToJsonSchema(z.object({
      directoryPath: z.string().describe("Path to the directory to list"),
      recursive: z
        .boolean()
        .optional()
        .describe("Include subdirectories recursively"),
      includeHidden: z
        .boolean()
        .optional()
        .describe("Include hidden files and directories"),
    })),
  }
);

// Create Directory Tool
export const createDirectoryTool = tool(
  async (input) => {
    const { directoryPath, recursive = true } = input as {
      directoryPath: string;
      recursive?: boolean;
    };
    try {
      await fs.mkdir(directoryPath, { recursive });

      return {
        success: true,
        directoryPath: directoryPath,
        created: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        directoryPath: directoryPath,
      };
    }
  },
  {
    name: "create_directory",
    description: "Create a new directory",
    schema: zodToJsonSchema(z.object({
      directoryPath: z.string().describe("Path of the directory to create"),
      recursive: z
        .boolean()
        .optional()
        .describe("Create parent directories if they do not exist"),
    })),
  }
);

// Delete File/Directory Tool
export const deleteTool = tool(
  async (input) => {
    const { targetPath, recursive = false } = input as {
      targetPath: string;
      recursive?: boolean;
    };
    try {
      const stats = await fs.stat(targetPath);

      if (stats.isDirectory()) {
        await fs.rmdir(targetPath, { recursive });
      } else {
        await fs.unlink(targetPath);
      }

      return {
        success: true,
        targetPath: targetPath,
        deleted: true,
        type: stats.isDirectory() ? "directory" : "file",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        targetPath: targetPath,
      };
    }
  },
  {
    name: "delete_item",
    description: "Delete a file or directory",
    schema: zodToJsonSchema(z.object({
      targetPath: z
        .string()
        .describe("Path to the file or directory to delete"),
      recursive: z
        .boolean()
        .optional()
        .describe("Delete directories recursively"),
    })),
  }
);

// Move/Rename Tool
export const moveTool = tool(
  async (input) => {
    const { sourcePath, destinationPath, overwrite = false } = input as {
      sourcePath: string;
      destinationPath: string;
      overwrite?: boolean;
    };
    try {
      // Check if destination exists
      if (!overwrite) {
        try {
          await fs.access(destinationPath);
          return {
            success: false,
            error: "Destination already exists. Set overwrite=true to replace.",
            sourcePath: sourcePath,
            destinationPath: destinationPath,
          };
        } catch (error) {
          // Destination doesn't exist, which is what we want
        }
      }

      await fs.rename(sourcePath, destinationPath);

      return {
        success: true,
        sourcePath: sourcePath,
        destinationPath: destinationPath,
        moved: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        sourcePath: sourcePath,
        destinationPath: destinationPath,
      };
    }
  },
  {
    name: "move_item",
    description: "Move or rename a file or directory",
    schema: zodToJsonSchema(z.object({
      sourcePath: z.string().describe("Current path of the item"),
      destinationPath: z.string().describe("New path for the item"),
      overwrite: z
        .boolean()
        .optional()
        .describe("Overwrite destination if it exists"),
    })),
  }
);

// Search Files Tool
export const searchFilesTool = tool(
  async (input) => {
    const { searchPath, pattern, fileTypes = [], maxResults = 50 } = input as {
      searchPath: string;
      pattern: string;
      fileTypes?: string[];
      maxResults?: number;
    };
    try {
      const results = await searchFiles(
        searchPath,
        pattern,
        fileTypes,
        maxResults
      );

      return {
        success: true,
        searchPath: searchPath,
        pattern: pattern,
        results: results,
        count: results.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        searchPath: searchPath,
        pattern: pattern,
      };
    }
  },
  {
    name: "search_files",
    description: "Search for files matching a pattern",
    schema: zodToJsonSchema(z.object({
      searchPath: z.string().describe("Directory to search in"),
      pattern: z.string().describe("Search pattern (supports wildcards)"),
      fileTypes: z
        .array(z.string())
        .optional()
        .describe('File extensions to filter by (e.g., [".js", ".ts"])'),
      maxResults: z
        .number()
        .optional()
        .describe("Maximum number of results to return"),
    })),
  }
);

// Helper Functions
async function readDirectory(
  dirPath: string,
  recursive: boolean,
  includeHidden: boolean
): Promise<DirectoryItem[]> {
  const items: DirectoryItem[] = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!includeHidden && entry.name.startsWith(".")) {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    const stats = await fs.stat(fullPath);

    const item: DirectoryItem = {
      name: entry.name,
      path: fullPath,
      type: entry.isDirectory() ? "directory" : "file",
      size: entry.isFile() ? stats.size : undefined,
      lastModified: stats.mtime,
      extension: entry.isFile() ? path.extname(entry.name) : undefined,
    };

    items.push(item);

    if (recursive && entry.isDirectory()) {
      const subItems = await readDirectory(fullPath, recursive, includeHidden);
      items.push(...subItems);
    }
  }

  return items;
}

export async function searchFiles(
  searchPath: string,
  pattern: string,
  fileTypes: string[],
  maxResults: number
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const regex = new RegExp(pattern.replace(/\*/g, ".*"), "i");

  async function searchRecursive(currentPath: string): Promise<void> {
    if (results.length >= maxResults) return;

    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (results.length >= maxResults) break;

        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          await searchRecursive(fullPath);
        } else {
          // Check file type filter
          if (fileTypes.length > 0) {
            const ext = path.extname(entry.name);
            if (!fileTypes.includes(ext)) continue;
          }

          // Check pattern match
          if (regex.test(entry.name)) {
            const stats = await fs.stat(fullPath);
            results.push({
              name: entry.name,
              path: fullPath,
              size: stats.size,
              lastModified: stats.mtime,
              extension: path.extname(entry.name),
            });
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  await searchRecursive(searchPath);
  return results;
}

// Export all tools as an array for easy registration
export const allFileTools = [
  readFileTool,
  writeFileTool,
  listDirectoryTool,
  createDirectoryTool,
  deleteTool,
  moveTool,
  searchFilesTool,
];

// Export type definitions for external use
export type {
  FileReadResult,
  FileReadError,
  FileWriteResult,
  FileWriteError,
  DirectoryItem,
  ListDirectoryResult,
  ListDirectoryError,
  CreateDirectoryResult,
  CreateDirectoryError,
  DeleteResult,
  DeleteError,
  MoveResult,
  MoveError,
  SearchResult,
  SearchFilesResult,
  SearchFilesError,
};

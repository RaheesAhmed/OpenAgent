import fs from 'fs-extra';
import path from 'path';

export interface ListDirectoryParams {
  path: string;
  recursive?: boolean; // Show subdirectories recursively (default: false)
  show_hidden?: boolean; // Show hidden files/dirs (default: false)
  details?: boolean; // Show file sizes, dates, etc. (default: false)
}

export interface FileInfo {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: Date;
  path: string;
}

export interface ListDirectoryResult {
  success: boolean;
  items: FileInfo[];
  message: string;
  error?: string;
}

/**
 * List directory contents with optional details
 */
export async function listDirectory(params: ListDirectoryParams): Promise<ListDirectoryResult> {
  try {
    const { path: dirPath, recursive = false, show_hidden = false, details = false } = params;
    
    // Check if path exists
    if (!await fs.pathExists(dirPath)) {
      return {
        success: false,
        items: [],
        message: '',
        error: `Directory not found: ${dirPath}`
      };
    }
    
    // Check if it's a directory
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      return {
        success: false,
        items: [],
        message: '',
        error: `Not a directory: ${dirPath}`
      };
    }
    
    const items: FileInfo[] = [];
    
    if (recursive) {
      await collectItemsRecursive(dirPath, items, show_hidden, details, dirPath);
    } else {
      const entries = await fs.readdir(dirPath);
      
      for (const entry of entries) {
        // Skip hidden files if not requested
        if (!show_hidden && entry.startsWith('.')) {
          continue;
        }
        
        const fullPath = path.join(dirPath, entry);
        const itemStats = await fs.stat(fullPath);
        
        const item: FileInfo = {
          name: entry,
          type: itemStats.isDirectory() ? 'directory' : 'file',
          path: fullPath
        };
        
        if (details) {
          item.size = itemStats.size;
          item.modified = itemStats.mtime;
        }
        
        items.push(item);
      }
    }
    
    // Sort items: directories first, then files, alphabetically
    items.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    
    // Format message
    let message = `Found ${items.length} items in ${dirPath}`;
    if (recursive) message += ' (recursive)';
    
    return {
      success: true,
      items,
      message
    };
    
  } catch (error) {
    return {
      success: false,
      items: [],
      message: '',
      error: `Error listing directory: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Recursively collect items from directory tree
 */
async function collectItemsRecursive(
  currentPath: string, 
  items: FileInfo[], 
  showHidden: boolean, 
  details: boolean,
  basePath: string
): Promise<void> {
  const entries = await fs.readdir(currentPath);
  
  for (const entry of entries) {
    // Skip hidden files if not requested
    if (!showHidden && entry.startsWith('.')) {
      continue;
    }
    
    const fullPath = path.join(currentPath, entry);
    const relativePath = path.relative(basePath, fullPath);
    const itemStats = await fs.stat(fullPath);
    
    const item: FileInfo = {
      name: relativePath,
      type: itemStats.isDirectory() ? 'directory' : 'file',
      path: fullPath
    };
    
    if (details) {
      item.size = itemStats.size;
      item.modified = itemStats.mtime;
    }
    
    items.push(item);
    
    // Recurse into subdirectories
    if (itemStats.isDirectory()) {
      await collectItemsRecursive(fullPath, items, showHidden, details, basePath);
    }
  }
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export const listDirectoryToolDefinition = {
  name: 'list_directory',
  description: 'List contents of a directory with optional details and recursive listing',
  input_schema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the directory to list'
      },
      recursive: {
        type: 'boolean',
        description: 'Show subdirectories recursively (default: false)',
        default: false
      },
      show_hidden: {
        type: 'boolean',
        description: 'Show hidden files and directories (default: false)',
        default: false
      },
      details: {
        type: 'boolean',
        description: 'Show file sizes, modification dates, etc. (default: false)',
        default: false
      }
    },
    required: ['path']
  }
};
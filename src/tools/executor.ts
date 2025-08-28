import {
  readFile, ReadFileParams,
  createFile, CreateFileParams,
  searchReplace, SearchReplaceParams,
  deleteFile, DeleteFileParams,
  listDirectory, ListDirectoryParams,
  executeCommand, TerminalParams
} from './index.js';

export interface ToolExecutionResult {
  success: boolean;
  content: string;
  error?: string;
  metadata?: any;
}

/**
 * Execute custom tools based on tool name and parameters
 */
export async function executeCustomTool(toolName: string, params: any): Promise<ToolExecutionResult> {
  try {
    switch (toolName) {
      case 'read_file': {
        const result = await readFile(params as ReadFileParams);
        const response: ToolExecutionResult = {
          success: result.success,
          content: result.success ? result.content : '',
          metadata: { totalLines: result.totalLines }
        };
        if (result.error) {
          response.error = result.error;
        }
        return response;
      }

      case 'create_file': {
        const result = await createFile(params as CreateFileParams);
        const response: ToolExecutionResult = {
          success: result.success,
          content: result.message
        };
        if (result.error) {
          response.error = result.error;
        }
        return response;
      }

      case 'search_replace': {
        const result = await searchReplace(params as SearchReplaceParams);
        const response: ToolExecutionResult = {
          success: result.success,
          content: result.message,
          metadata: { replacementCount: result.replacementCount }
        };
        if (result.error) {
          response.error = result.error;
        }
        return response;
      }

      case 'delete_file': {
        const result = await deleteFile(params as DeleteFileParams);
        const response: ToolExecutionResult = {
          success: result.success,
          content: result.message
        };
        if (result.error) {
          response.error = result.error;
        }
        return response;
      }

      case 'list_directory': {
        const result = await listDirectory(params as ListDirectoryParams);
        if (result.success) {
          const formattedContent = formatDirectoryListing(result.items, params.details);
          return {
            success: true,
            content: `${result.message}\n\n${formattedContent}`,
            metadata: { itemCount: result.items.length }
          };
        } else {
          const response: ToolExecutionResult = {
            success: false,
            content: ''
          };
          if (result.error) {
            response.error = result.error;
          }
          return response;
        }
      }

      case 'terminal': {
        const result = await executeCommand(params as TerminalParams);
        let content = '';
        
        if (result.stdout) {
          content += `STDOUT:\n${result.stdout}`;
        }
        if (result.stderr) {
          content += `${content ? '\n\n' : ''}STDERR:\n${result.stderr}`;
        }
        if (!result.stdout && !result.stderr && result.success) {
          content = 'Command executed successfully (no output)';
        }
        
        const response: ToolExecutionResult = {
          success: result.success,
          content,
          metadata: {
            exitCode: result.exitCode,
            executionTime: result.executionTime
          }
        };
        if (result.error) {
          response.error = result.error;
        }
        return response;
      }

      default:
        return {
          success: false,
          content: '',
          error: `Unknown tool: ${toolName}`
        };
    }
  } catch (error) {
    return {
      success: false,
      content: '',
      error: `Tool execution error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Format directory listing for display
 */
function formatDirectoryListing(items: any[], showDetails?: boolean): string {
  if (items.length === 0) {
    return 'No items found.';
  }

  const lines: string[] = [];
  
  for (const item of items) {
    let line = '';
    
    // Type indicator
    const typeIndicator = item.type === 'directory' ? '[DIR] ' : '[FILE]';
    line += typeIndicator;
    
    // Name
    line += item.name;
    
    // Details if requested
    if (showDetails && item.size !== undefined) {
      line += ` (${formatFileSize(item.size)})`;
    }
    
    if (showDetails && item.modified) {
      line += ` - Modified: ${item.modified.toLocaleString()}`;
    }
    
    lines.push(line);
  }
  
  return lines.join('\n');
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
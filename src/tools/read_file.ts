import fs from 'fs-extra';
import path from 'path';

export interface ReadFileParams {
  path: string;
  view_range?: [number, number]; // [start_line, end_line] - 1-indexed
}

export interface ReadFileResult {
  success: boolean;
  content: string;
  error?: string;
  totalLines?: number;
}

/**
 * Read file contents with optional line range
 */
export async function readFile(params: ReadFileParams): Promise<ReadFileResult> {
  try {
    const { path: filePath, view_range } = params;
    
    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      return {
        success: false,
        content: '',
        error: `File not found: ${filePath}`
      };
    }
    
    // Check if it's a directory
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      const items = await fs.readdir(filePath);
      const itemsWithTypes = await Promise.all(
        items.map(async (item) => {
          const itemPath = path.join(filePath, item);
          const itemStats = await fs.stat(itemPath);
          return `${itemStats.isDirectory() ? '[DIR]' : '[FILE]'} ${item}`;
        })
      );
      
      return {
        success: true,
        content: itemsWithTypes.join('\n'),
        totalLines: itemsWithTypes.length
      };
    }
    
    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    let displayContent: string;
    let displayLines: string[];
    
    if (view_range) {
      const [start, end] = view_range;
      const startIdx = Math.max(0, start - 1); // Convert to 0-indexed
      const endIdx = end === -1 ? lines.length : Math.min(lines.length, end);
      
      displayLines = lines.slice(startIdx, endIdx);
      displayContent = displayLines
        .map((line, idx) => `${startIdx + idx + 1}: ${line}`)
        .join('\n');
    } else {
      displayLines = lines;
      displayContent = lines
        .map((line, idx) => `${idx + 1}: ${line}`)
        .join('\n');
    }
    
    return {
      success: true,
      content: displayContent,
      totalLines: lines.length
    };
    
  } catch (error) {
    return {
      success: false,
      content: '',
      error: `Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export const readFileToolDefinition = {
  name: 'read_file',
  description: 'Read file contents or list directory contents with optional line range',
  input_schema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file or directory to read'
      },
      view_range: {
        type: 'array',
        items: { type: 'number' },
        minItems: 2,
        maxItems: 2,
        description: 'Optional [start_line, end_line] range (1-indexed), use -1 for end to read to end of file'
      }
    },
    required: ['path']
  }
};
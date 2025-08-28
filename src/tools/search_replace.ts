import fs from 'fs-extra';

export interface SearchReplaceParams {
  path: string;
  old_str: string;
  new_str: string;
  count?: number; // Number of replacements to make (default: all)
}

export interface SearchReplaceResult {
  success: boolean;
  message: string;
  replacementCount: number;
  error?: string;
}

/**
 * Search and replace text in a file
 */
export async function searchReplace(params: SearchReplaceParams): Promise<SearchReplaceResult> {
  try {
    const { path: filePath, old_str, new_str, count } = params;
    
    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      return {
        success: false,
        message: '',
        replacementCount: 0,
        error: `File not found: ${filePath}`
      };
    }
    
    // Check if it's a directory
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      return {
        success: false,
        message: '',
        replacementCount: 0,
        error: `Cannot edit directory: ${filePath}`
      };
    }
    
    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Perform replacement
    let newContent: string;
    let replacementCount = 0;
    
    if (count && count > 0) {
      // Limited replacements
      let tempContent = content;
      for (let i = 0; i < count; i++) {
        const index = tempContent.indexOf(old_str);
        if (index === -1) break;
        tempContent = tempContent.substring(0, index) + new_str + tempContent.substring(index + old_str.length);
        replacementCount++;
      }
      newContent = tempContent;
    } else {
      // Replace all occurrences
      const matches = content.match(new RegExp(escapeRegExp(old_str), 'g'));
      replacementCount = matches ? matches.length : 0;
      newContent = content.split(old_str).join(new_str);
    }
    
    if (replacementCount === 0) {
      return {
        success: false,
        message: '',
        replacementCount: 0,
        error: `String not found: "${old_str}"`
      };
    }
    
    // Write updated content
    await fs.writeFile(filePath, newContent, 'utf-8');
    
    return {
      success: true,
      message: `File updated: ${filePath} (${replacementCount} replacement${replacementCount > 1 ? 's' : ''})`,
      replacementCount
    };
    
  } catch (error) {
    return {
      success: false,
      message: '',
      replacementCount: 0,
      error: `Error updating file: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const searchReplaceToolDefinition = {
  name: 'search_replace',
  description: 'Search and replace text in a file',
  input_schema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to edit'
      },
      old_str: {
        type: 'string',
        description: 'Text to search for and replace'
      },
      new_str: {
        type: 'string',
        description: 'Text to replace with'
      },
      count: {
        type: 'number',
        description: 'Maximum number of replacements to make (default: all occurrences)',
        minimum: 1
      }
    },
    required: ['path', 'old_str', 'new_str']
  }
};
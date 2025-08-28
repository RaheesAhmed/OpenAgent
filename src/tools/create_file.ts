import fs from 'fs-extra';
import path from 'path';

export interface CreateFileParams {
  path: string;
  file_text: string;
  overwrite?: boolean; // Default false
}

export interface CreateFileResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Create a new file with content
 */
export async function createFile(params: CreateFileParams): Promise<CreateFileResult> {
  try {
    const { path: filePath, file_text, overwrite = false } = params;
    
    // Check if file already exists
    if (await fs.pathExists(filePath) && !overwrite) {
      return {
        success: false,
        message: '',
        error: `File already exists: ${filePath}. Use overwrite: true to replace it.`
      };
    }
    
    // Ensure directory exists
    const dirPath = path.dirname(filePath);
    await fs.ensureDir(dirPath);
    
    // Write file
    await fs.writeFile(filePath, file_text, 'utf-8');
    
    return {
      success: true,
      message: `File created successfully: ${filePath}`
    };
    
  } catch (error) {
    return {
      success: false,
      message: '',
      error: `Error creating file: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export const createFileToolDefinition = {
  name: 'create_file',
  description: 'Create a new file with specified content',
  input_schema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path where the file should be created'
      },
      file_text: {
        type: 'string',
        description: 'Content to write to the file'
      },
      overwrite: {
        type: 'boolean',
        description: 'Whether to overwrite existing file (default: false)',
        default: false
      }
    },
    required: ['path', 'file_text']
  }
};
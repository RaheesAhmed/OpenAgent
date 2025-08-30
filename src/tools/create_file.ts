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
    
    // Validate parameters
    if (!filePath || typeof filePath !== 'string' || !filePath.trim()) {
      return {
        success: false,
        message: '',
        error: 'Parameter "path" is required and must be a non-empty string'
      };
    }
    
    if (file_text === undefined || typeof file_text !== 'string') {
      return {
        success: false,
        message: '',
        error: 'Parameter "file_text" is required and must be a string'
      };
    }
    
    const normalizedPath = path.resolve(filePath.trim());
    
    // Check if file already exists
    if (await fs.pathExists(normalizedPath) && !overwrite) {
      return {
        success: false,
        message: '',
        error: `File already exists: ${normalizedPath}. Use overwrite: true to replace it.`
      };
    }
    
    // Ensure directory exists
    const dirPath = path.dirname(normalizedPath);
    await fs.ensureDir(dirPath);
    
    // Write file
    await fs.writeFile(normalizedPath, file_text, 'utf-8');
    
    return {
      success: true,
      message: `File created successfully: ${normalizedPath}`
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
  description: 'Create a new file with specified content provide the file path and text both are manadatory Example: { "path": "src/components/Button.tsx", "file_text": "import React from;...", "overwrite": false }',
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
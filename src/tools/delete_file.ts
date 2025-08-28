import fs from 'fs-extra';

export interface DeleteFileParams {
  path: string;
  recursive?: boolean; // For directories (default: false)
  force?: boolean; // Skip confirmation (default: false)
}

export interface DeleteFileResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Delete a file or directory
 */
export async function deleteFile(params: DeleteFileParams): Promise<DeleteFileResult> {
  try {
    const { path: filePath, recursive = false } = params;
    
    // Check if file/directory exists
    if (!await fs.pathExists(filePath)) {
      return {
        success: false,
        message: '',
        error: `Path not found: ${filePath}`
      };
    }
    
    // Get file stats
    const stats = await fs.stat(filePath);
    
    if (stats.isDirectory()) {
      if (!recursive) {
        // Check if directory is empty
        const items = await fs.readdir(filePath);
        if (items.length > 0) {
          return {
            success: false,
            message: '',
            error: `Directory not empty: ${filePath}. Use recursive: true to delete non-empty directories.`
          };
        }
      }
      
      // Remove directory
      await fs.remove(filePath);
      
      return {
        success: true,
        message: `Directory deleted: ${filePath}`
      };
    } else {
      // Remove file
      await fs.remove(filePath);
      
      return {
        success: true,
        message: `File deleted: ${filePath}`
      };
    }
    
  } catch (error) {
    return {
      success: false,
      message: '',
      error: `Error deleting: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export const deleteFileToolDefinition = {
  name: 'delete_file',
  description: 'Delete a file or directory',
  input_schema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file or directory to delete'
      },
      recursive: {
        type: 'boolean',
        description: 'Allow deletion of non-empty directories (default: false)',
        default: false
      },
      force: {
        type: 'boolean',
        description: 'Skip confirmation prompts (default: false)',
        default: false
      }
    },
    required: ['path']
  }
};
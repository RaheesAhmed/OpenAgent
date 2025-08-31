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
    // Add debug logging to see what parameters we're receiving
    console.log('[DEBUG] create_file received params:', JSON.stringify(params, null, 2));
    
    const { path: filePath, file_text, overwrite = false } = params;
    
    // Handle case where path might be undefined or in wrong format
    if (!filePath) {
      console.log('[DEBUG] filePath is undefined, checking params structure');
      console.log('[DEBUG] params keys:', Object.keys(params));
      
      // Try to find path in different possible locations
      const actualPath = params.path
      if (actualPath) {
        console.log('[DEBUG] Found path in alternate location:', actualPath);
        const normalizedPath = path.resolve(actualPath);
        
        // Continue with file creation using alternate path
        if (await fs.pathExists(normalizedPath) && !overwrite) {
          return {
            success: false,
            message: '',
            error: `File already exists at: ${normalizedPath}. Set "overwrite": true to replace the existing file`
          };
        }
        
        const dirPath = path.dirname(normalizedPath);
        await fs.ensureDir(dirPath);
        await fs.writeFile(normalizedPath, file_text || '', 'utf-8');
        
        const fileSize = Buffer.byteLength(file_text || '', 'utf-8');
        
        return {
          success: true,
          message: `File created successfully at: ${normalizedPath} (${fileSize} bytes)`
        };
      } else {
        return {
          success: false,
          message: '',
          error: `No valid path found in parameters. Received: ${JSON.stringify(params)}`
        };
      }
    }
    
    const normalizedPath = path.resolve(filePath);
    
    // Check if file already exists
    if (await fs.pathExists(normalizedPath) && !overwrite) {
      return {
        success: false,
        message: '',
        error: `File already exists at: ${normalizedPath}. Set "overwrite": true to replace the existing file`
      };
    }
    
    // Ensure directory exists
    const dirPath = path.dirname(normalizedPath);
    await fs.ensureDir(dirPath);
    
    // Write file
    await fs.writeFile(normalizedPath, file_text, 'utf-8');
    
    const fileSize = Buffer.byteLength(file_text, 'utf-8');
    
    return {
      success: true,
      message: `File created successfully at: ${normalizedPath} (${fileSize} bytes)`
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: '',
      error: `Failed to create file: ${errorMessage}. Please check the file path and permissions.`
    };
  }
}

export const createFileToolDefinition = {
  name: "create_file",
  description:
    "Creates a new file... IMPORTANT: Always provide complete JSON parameters in a single call.",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description:
          'The complete file path where the file should be created, including the filename and extension. Can be relative (e.g., "src/components/Button.tsx") or absolute (e.g., "d:\\project\\landingpage\\index.html"). Must be a valid path string. The tool will automatically create any missing directories in the path.',
      },
      file_text: {
        type: "string",
        description:
          "The complete content that will be written to the file. This should contain the entire file content as a string, including all code, markup, or text that should be in the final file. Can be empty string to create an empty file.",
      },
      overwrite: {
        type: "boolean",
        description:
          "Whether to overwrite the file if it already exists. If set to false (default), the tool will return an error if the file already exists. If set to true, it will replace the existing file with the new content.",
        default: false,
      },
    },
    required: ["path", "file_text"],
  },
};

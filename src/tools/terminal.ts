import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

export interface TerminalParams {
  command: string;
  cwd?: string; // Working directory
  timeout?: number; // Timeout in milliseconds (default: 30000)
  env?: Record<string, string>; // Environment variables
  interactive?: boolean; // For interactive commands (default: false)
}

export interface TerminalResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: string;
  executionTime: number;
}

/**
 * Execute shell commands
 */
export async function executeCommand(params: TerminalParams): Promise<TerminalResult> {
  const startTime = Date.now();
  const { command, cwd = process.cwd(), timeout = 30000, env = {}, interactive = false } = params;
  
  try {
    // Merge environment variables
    const mergedEnv: Record<string, string> = {};
    
    // Copy process.env with proper typing
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        mergedEnv[key] = value;
      }
    }
    
    // Add custom env vars
    Object.assign(mergedEnv, env);
    
    if (interactive) {
      // For interactive commands, use spawn
      return await executeInteractiveCommand(command, cwd, timeout, mergedEnv, startTime);
    } else {
      // For regular commands, use exec
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout,
        env: mergedEnv,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      return {
        success: true,
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        exitCode: 0,
        executionTime: Date.now() - startTime
      };
    }
    
  } catch (error: any) {
    let exitCode = 1;
    let stderr = '';
    let stdout = '';
    
    if (error.code === 'ETIMEDOUT') {
      return {
        success: false,
        stdout: '',
        stderr: '',
        exitCode: 124, // Timeout exit code
        error: `Command timed out after ${timeout}ms`,
        executionTime: Date.now() - startTime
      };
    }
    
    if (error.stdout) stdout = error.stdout.toString();
    if (error.stderr) stderr = error.stderr.toString();
    if (typeof error.code === 'number') exitCode = error.code;
    
    return {
      success: false,
      stdout,
      stderr,
      exitCode,
      error: error.message || 'Command execution failed',
      executionTime: Date.now() - startTime
    };
  }
}

/**
 * Execute interactive commands using spawn
 */
function executeInteractiveCommand(
  command: string, 
  cwd: string, 
  timeout: number, 
  env: Record<string, string>,
  startTime: number
): Promise<TerminalResult> {
  return new Promise((resolve) => {
    const isWindows = os.platform() === 'win32';
    const shell = isWindows ? 'cmd.exe' : '/bin/bash';
    const shellArgs = isWindows ? ['/c', command] : ['-c', command];
    
    const child = spawn(shell, shellArgs, {
      cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    
    // Set timeout
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeout);
    
    // Collect stdout
    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    // Collect stderr
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Handle process exit
    child.on('close', (code) => {
      clearTimeout(timeoutHandle);
      
      if (timedOut) {
        resolve({
          success: false,
          stdout,
          stderr,
          exitCode: 124,
          error: `Command timed out after ${timeout}ms`,
          executionTime: Date.now() - startTime
        });
      } else {
        resolve({
          success: code === 0,
          stdout,
          stderr,
          exitCode: code || 0,
          executionTime: Date.now() - startTime
        });
      }
    });
    
    // Handle errors
    child.on('error', (error) => {
      clearTimeout(timeoutHandle);
      resolve({
        success: false,
        stdout,
        stderr,
        exitCode: 1,
        error: error.message,
        executionTime: Date.now() - startTime
      });
    });
  });
}

/**
 * Get system information
 */
export function getSystemInfo() {
  return {
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    homedir: os.homedir(),
    tmpdir: os.tmpdir(),
    cwd: process.cwd(),
    nodeVersion: process.version,
    env: {
      PATH: process.env['PATH'],
      HOME: process.env['HOME'] || process.env['USERPROFILE'],
      SHELL: process.env['SHELL'] || process.env['COMSPEC']
    }
  };
}

export const terminalToolDefinition = {
  name: 'terminal',
  description: 'Execute shell commands in the terminal',
  input_schema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'Shell command to execute'
      },
      cwd: {
        type: 'string',
        description: 'Working directory for command execution (default: current directory)'
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds (default: 30000)',
        default: 30000,
        minimum: 1000,
        maximum: 300000
      },
      env: {
        type: 'object',
        description: 'Environment variables to set for the command',
        additionalProperties: {
          type: 'string'
        }
      },
      interactive: {
        type: 'boolean',
        description: 'Whether this is an interactive command (default: false)',
        default: false
      }
    },
    required: ['command']
  }
};
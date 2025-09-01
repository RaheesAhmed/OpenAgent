import { tool } from '@langchain/core/tools';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

export interface TerminalResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: string;
  executionTime: number;
}

/**
 * Execute shell commands using LangChain tool format
 */
export const terminalTool = tool(
  async (input: unknown) => {
    const startTime = Date.now();
    
    try {
      const { 
        command, 
        cwd = process.cwd(), 
        timeout = 30000, 
        env = {}, 
        interactive = false 
      } = input as {
        command: string;
        cwd?: string;
        timeout?: number;
        env?: Record<string, string>;
        interactive?: boolean;
      };
      
      if (!command) {
        return `Error: No command provided. Received: ${JSON.stringify(input)}`;
      }
      
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
      
      let result: TerminalResult;
      
      if (interactive) {
        // For interactive commands, use spawn
        result = await executeInteractiveCommand(command, cwd, timeout, mergedEnv, startTime);
      } else {
        // For regular commands, use exec
        try {
          const { stdout, stderr } = await execAsync(command, {
            cwd,
            timeout,
            env: mergedEnv,
            maxBuffer: 1024 * 1024 * 10 // 10MB buffer
          });
          
          result = {
            success: true,
            stdout: stdout.toString(),
            stderr: stderr.toString(),
            exitCode: 0,
            executionTime: Date.now() - startTime
          };
        } catch (error: any) {
          let exitCode = 1;
          let stderr = '';
          let stdout = '';
          
          if (error.code === 'ETIMEDOUT') {
            result = {
              success: false,
              stdout: '',
              stderr: '',
              exitCode: 124, // Timeout exit code
              error: `Command timed out after ${timeout}ms`,
              executionTime: Date.now() - startTime
            };
          } else {
            if (error.stdout) stdout = error.stdout.toString();
            if (error.stderr) stderr = error.stderr.toString();
            if (typeof error.code === 'number') exitCode = error.code;
            
            result = {
              success: false,
              stdout,
              stderr,
              exitCode,
              error: error.message || 'Command execution failed',
              executionTime: Date.now() - startTime
            };
          }
        }
      }
      
      // Format the output
      let output = `${result.success ? '✅' : '❌'} Command: ${command}\n`;
      output += `📁 Working Directory: ${cwd}\n`;
      output += `⏱️ Execution Time: ${result.executionTime}ms\n`;
      output += `🚪 Exit Code: ${result.exitCode}\n\n`;
      
      if (result.stdout) {
        output += `📤 STDOUT:\n${result.stdout}\n`;
      }
      
      if (result.stderr) {
        output += `📥 STDERR:\n${result.stderr}\n`;
      }
      
      if (result.error) {
        output += `❌ ERROR: ${result.error}\n`;
      }
      
      return output;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return `❌ Terminal execution failed: ${errorMessage}`;
    }
  },
  {
    name: "terminal",
    description: "Execute shell commands in the terminal. Input should be an object with 'command' (string), optional 'cwd' (working directory), 'timeout' (milliseconds), 'env' (environment variables), and 'interactive' (boolean)."
  }
);

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

// Legacy function for backward compatibility (if needed)
export async function executeCommand(params: {
  command: string;
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
  interactive?: boolean;
}): Promise<TerminalResult> {
  const result = await terminalTool.invoke(params);
  
  // Parse the formatted result back to structured format if needed
  const success = result.startsWith('✅');
  
  // This is a simplified parsing - in practice, you might want to keep the structured data
  const terminalResult: TerminalResult = {
    success,
    stdout: '', // Would need more complex parsing to extract
    stderr: '',
    exitCode: success ? 0 : 1,
    executionTime: 0
  };
  
  if (!success) {
    terminalResult.error = result.replace('❌ ', '');
  }
  
  return terminalResult;
}
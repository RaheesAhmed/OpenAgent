import { tool } from '@langchain/core/tools';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Simple Terminal Tool - Just execute commands, no bullshit
 */
export const terminalTool = tool(
  async (input: unknown) => {
    try {
      // Handle different input formats
      let command: string;
      let workingDirectory: string | undefined;
      
      if (typeof input === 'string') {
        command = input;
      } else if (typeof input === 'object' && input !== null) {
        const inputObj = input as any;
        command = inputObj.command || inputObj.input || inputObj;
        workingDirectory = inputObj.workingDirectory || inputObj.cwd;
      } else {
        return `❌ Error: Invalid command format. Received: ${JSON.stringify(input)}`;
      }

      if (!command || typeof command !== 'string') {
        return `❌ Error: Command must be a string. Received: ${JSON.stringify(command)}`;
      }

      console.log(`🔧 Executing: ${command}`);
      if (workingDirectory) {
        console.log(`📁 Working Directory: ${workingDirectory}`);
      }

      const startTime = Date.now();
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: workingDirectory || process.cwd(),
        timeout: 30000,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      const executionTime = Date.now() - startTime;
      
      let output = `✅ Command executed successfully (${executionTime}ms)\n`;
      
      if (stdout) {
        output += `📤 Output:\n${stdout}\n`;
      }
      
      if (stderr) {
        output += `⚠️ Warnings:\n${stderr}\n`;
      }
      
      return output;
      
    } catch (error: any) {
      const executionTime = Date.now() - Date.now();
      let output = `❌ Command failed (${executionTime}ms)\n`;
      
      if (error.stdout) {
        output += `📤 Output:\n${error.stdout}\n`;
      }
      
      if (error.stderr) {
        output += `📥 Error Output:\n${error.stderr}\n`;
      }
      
      output += `💥 Error: ${error.message}\n`;
      output += `🚪 Exit Code: ${error.code || -1}\n`;
      
      return output;
    }
  },
  {
    name: "terminal",
    description: "Execute any command in the terminal. Just provide the command as a string or object with 'command' property. Examples: 'node --version', 'npm install', 'git status', 'ls -la'"
  }
);

// Export as array for OpenAgent integration
export const allTerminalTools = [terminalTool];

// Legacy exports for compatibility
export const executeCommandTool = terminalTool;
export const npmOperationTool = terminalTool;
export const gitOperationTool = terminalTool;
export const processManagementTool = terminalTool;
export const environmentInfoTool = terminalTool;

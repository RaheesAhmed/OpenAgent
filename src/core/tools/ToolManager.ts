import { Tool } from '../../types/agent.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Tool manager for agent capabilities
 */
export class ToolManager {
  private static instance: ToolManager;
  private tools: Map<string, Tool> = new Map();
  private toolHandlers: Map<string, (input: any) => Promise<any>> = new Map();

  private constructor() {
    this.initializeBuiltInTools();
  }

  public static getInstance(): ToolManager {
    if (!ToolManager.instance) {
      ToolManager.instance = new ToolManager();
    }
    return ToolManager.instance;
  }

  /**
   * Register custom tool
   */
  public registerTool(tool: Tool, handler: (input: any) => Promise<any>): void {
    this.tools.set(tool.name, tool);
    this.toolHandlers.set(tool.name, handler);
  }

  /**
   * Execute tool
   */
  public async executeTool(toolName: string, input: any): Promise<any> {
    const handler = this.toolHandlers.get(toolName);
    if (!handler) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    try {
      return await handler(input);
    } catch (error) {
      throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get available tools
   */
  public getAvailableTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  public getToolsByCategory(category: string): Tool[] {
    return this.getAvailableTools().filter(tool => 
      tool.name.startsWith(category) || tool.description.toLowerCase().includes(category)
    );
  }

  /**
   * Initialize built-in tools
   */
  private initializeBuiltInTools(): void {
    // File system tools
    this.registerFileSystemTools();
    
    // Code analysis tools
    this.registerCodeAnalysisTools();
    
    // Project management tools
    this.registerProjectTools();
    
    // Development tools
    this.registerDevelopmentTools();
    
    // Search tools
    this.registerSearchTools();
  }

  private registerFileSystemTools(): void {
    // Read file
    this.registerTool({
      name: 'read_file',
      description: 'Read contents of a file',
      input_schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to read' }
        },
        required: ['path']
      }
    }, async (input) => {
      const filePath = path.resolve(input.path);
      
      if (!await fs.pathExists(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      const content = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath);
      
      return {
        content,
        size: stats.size,
        modified: stats.mtime,
        path: filePath
      };
    });

    // Write file
    this.registerTool({
      name: 'write_file',
      description: 'Write content to a file',
      input_schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to write' },
          content: { type: 'string', description: 'Content to write' },
          createDirs: { type: 'boolean', description: 'Create directories if they don\'t exist' }
        },
        required: ['path', 'content']
      }
    }, async (input) => {
      const filePath = path.resolve(input.path);
      
      if (input.createDirs) {
        await fs.ensureDir(path.dirname(filePath));
      }
      
      await fs.writeFile(filePath, input.content, 'utf-8');
      
      return {
        path: filePath,
        bytesWritten: Buffer.byteLength(input.content, 'utf-8')
      };
    });

    // List directory
    this.registerTool({
      name: 'list_directory',
      description: 'List contents of a directory',
      input_schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory path' },
          recursive: { type: 'boolean', description: 'List recursively' }
        },
        required: ['path']
      }
    }, async (input) => {
      const dirPath = path.resolve(input.path);
      
      if (!await fs.pathExists(dirPath)) {
        throw new Error(`Directory not found: ${dirPath}`);
      }
      
      const items = [];
      
      if (input.recursive) {
        const walk = async (dir: string): Promise<void> => {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(dirPath, fullPath);
            
            items.push({
              name: entry.name,
              path: relativePath,
              type: entry.isDirectory() ? 'directory' : 'file',
              size: entry.isFile() ? (await fs.stat(fullPath)).size : 0
            });
            
            if (entry.isDirectory()) {
              await walk(fullPath);
            }
          }
        };
        
        await walk(dirPath);
      } else {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          
          items.push({
            name: entry.name,
            path: entry.name,
            type: entry.isDirectory() ? 'directory' : 'file',
            size: entry.isFile() ? (await fs.stat(fullPath)).size : 0
          });
        }
      }
      
      return { items, total: items.length };
    });
  }

  private registerCodeAnalysisTools(): void {
    // Analyze code structure
    this.registerTool({
      name: 'analyze_code',
      description: 'Analyze code structure and quality',
      input_schema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Code to analyze' },
          language: { type: 'string', description: 'Programming language' },
          filePath: { type: 'string', description: 'File path for context' }
        },
        required: ['code']
      }
    }, async (input) => {
      const analysis = {
        language: input.language || this.detectLanguage(input.code, input.filePath),
        linesOfCode: input.code.split('\n').length,
        complexity: this.calculateComplexity(input.code),
        functions: this.extractFunctions(input.code),
        imports: this.extractImports(input.code),
        exports: this.extractExports(input.code),
        todos: this.extractTodos(input.code),
        issues: this.findCodeIssues(input.code)
      };
      
      return analysis;
    });

    // Find dependencies
    this.registerTool({
      name: 'find_dependencies',
      description: 'Find project dependencies',
      input_schema: {
        type: 'object',
        properties: {
          projectPath: { type: 'string', description: 'Project root path' }
        },
        required: ['projectPath']
      }
    }, async (input) => {
      const dependencies = {
        package: await this.findPackageDependencies(input.projectPath),
        imports: await this.findImportDependencies(input.projectPath),
        system: await this.findSystemDependencies(input.projectPath)
      };
      
      return dependencies;
    });
  }

  private registerProjectTools(): void {
    // Initialize project
    this.registerTool({
      name: 'init_project',
      description: 'Initialize a new project',
      input_schema: {
        type: 'object',
        properties: {
          projectType: { type: 'string', description: 'Type of project (react, node, python, etc.)' },
          projectName: { type: 'string', description: 'Project name' },
          projectPath: { type: 'string', description: 'Project path' }
        },
        required: ['projectType', 'projectName']
      }
    }, async (input) => {
      const projectPath = input.projectPath || path.join(process.cwd(), input.projectName);
      
      await fs.ensureDir(projectPath);
      
      switch (input.projectType.toLowerCase()) {
        case 'react':
          return await this.initReactProject(projectPath, input.projectName);
        case 'node':
          return await this.initNodeProject(projectPath, input.projectName);
        case 'python':
          return await this.initPythonProject(projectPath, input.projectName);
        default:
          return await this.initGenericProject(projectPath, input.projectName);
      }
    });

    // Generate gitignore
    this.registerTool({
      name: 'generate_gitignore',
      description: 'Generate .gitignore file for project',
      input_schema: {
        type: 'object',
        properties: {
          projectType: { type: 'string', description: 'Project type' },
          additional: { type: 'array', description: 'Additional patterns to ignore' }
        },
        required: ['projectType']
      }
    }, async (input) => {
      const gitignore = this.generateGitignoreContent(input.projectType, input.additional || []);
      return { content: gitignore };
    });
  }

  private registerDevelopmentTools(): void {
    // Execute command
    this.registerTool({
      name: 'execute_command',
      description: 'Execute shell command',
      input_schema: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command to execute' },
          workingDir: { type: 'string', description: 'Working directory' },
          timeout: { type: 'number', description: 'Timeout in milliseconds' }
        },
        required: ['command']
      }
    }, async (input) => {
      const options: any = {
        cwd: input.workingDir || process.cwd(),
        timeout: input.timeout || 30000
      };
      
      const { stdout, stderr } = await execAsync(input.command, options);
      
      return {
        stdout: stdout.toString().trim(),
        stderr: stderr.toString().trim(),
        command: input.command,
        workingDir: options.cwd
      };
    });

    // Format code
    this.registerTool({
      name: 'format_code',
      description: 'Format code using appropriate formatter',
      input_schema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Code to format' },
          language: { type: 'string', description: 'Programming language' },
          config: { type: 'object', description: 'Formatter configuration' }
        },
        required: ['code', 'language']
      }
    }, async (input) => {
      const formatted = await this.formatCode(input.code, input.language, input.config);
      return { formatted, changes: this.getDiff(input.code, formatted) };
    });
  }

  private registerSearchTools(): void {
    // Search in files
    this.registerTool({
      name: 'search_files',
      description: 'Search for patterns in files',
      input_schema: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Search pattern (regex)' },
          path: { type: 'string', description: 'Search path' },
          filePattern: { type: 'string', description: 'File pattern to include' },
          caseSensitive: { type: 'boolean', description: 'Case sensitive search' }
        },
        required: ['pattern', 'path']
      }
    }, async (input) => {
      const results = await this.searchInFiles(
        input.pattern,
        input.path,
        input.filePattern,
        input.caseSensitive
      );
      
      return { results, totalMatches: results.length };
    });
  }

  // Helper methods
  private detectLanguage(code: string, filePath?: string): string {
    if (filePath) {
      const ext = path.extname(filePath);
      const langMap: Record<string, string> = {
        '.js': 'javascript',
        '.ts': 'typescript',
        '.jsx': 'javascript',
        '.tsx': 'typescript',
        '.py': 'python',
        '.java': 'java',
        '.go': 'go',
        '.rs': 'rust',
        '.cpp': 'cpp',
        '.c': 'c'
      };
      return langMap[ext] || 'unknown';
    }
    
    // Simple heuristics based on code content
    if (code.includes('import ') || code.includes('export ')) return 'javascript';
    if (code.includes('interface ') || code.includes(': string')) return 'typescript';
    if (code.includes('def ') || code.includes('import ')) return 'python';
    
    return 'unknown';
  }

  private calculateComplexity(code: string): number {
    const complexityPatterns = [
      /if\s*\(/g,
      /else\s*if/g,
      /for\s*\(/g,
      /while\s*\(/g,
      /switch\s*\(/g,
      /catch\s*\(/g,
      /&&/g,
      /\|\|/g
    ];
    
    let complexity = 1; // Base complexity
    
    for (const pattern of complexityPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return complexity;
  }

  private extractFunctions(code: string): string[] {
    const functionPatterns = [
      /function\s+(\w+)/g,
      /(\w+)\s*:\s*function/g,
      /(\w+)\s*=>\s*/g,
      /def\s+(\w+)/g
    ];
    
    const functions: string[] = [];
    
    for (const pattern of functionPatterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        if (match[1]) {
          functions.push(match[1]);
        }
      }
    }
    
    return functions;
  }

  private extractImports(code: string): string[] {
    const importPatterns = [
      /import\s+.*?from\s+['"]([^'"]+)['"]/g,
      /import\s+['"]([^'"]+)['"]/g,
      /require\(['"]([^'"]+)['"]\)/g
    ];
    
    const imports: string[] = [];
    
    for (const pattern of importPatterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        if (match[1]) {
          imports.push(match[1]);
        }
      }
    }
    
    return imports;
  }

  private extractExports(code: string): string[] {
    const exportPatterns = [
      /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g,
      /export\s*{\s*([^}]+)\s*}/g
    ];
    
    const exports: string[] = [];
    
    for (const pattern of exportPatterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        if (match[1]) {
          if (match[1].includes(',')) {
            exports.push(...match[1].split(',').map(s => s.trim()));
          } else {
            exports.push(match[1]);
          }
        }
      }
    }
    
    return exports;
  }

  private extractTodos(code: string): Array<{line: number, text: string}> {
    const lines = code.split('\n');
    const todos: Array<{line: number, text: string}> = [];
    
    lines.forEach((line, index) => {
      const match = line.match(/(TODO|FIXME|HACK|NOTE):\s*(.+)/i);
      if (match && match[2]) {
        todos.push({
          line: index + 1,
          text: match[2].trim()
        });
      }
    });
    
    return todos;
  }

  private findCodeIssues(code: string): string[] {
    const issues: string[] = [];
    
    // Basic code quality checks
    if (code.includes('console.log')) {
      issues.push('Contains console.log statements');
    }
    
    if (code.includes('var ')) {
      issues.push('Uses var instead of let/const');
    }
    
    if (code.includes('== ') && !code.includes('=== ')) {
      issues.push('Uses loose equality (==) instead of strict equality (===)');
    }
    
    return issues;
  }

  private async findPackageDependencies(projectPath: string): Promise<any> {
    const packageJsonPath = path.join(projectPath, 'package.json');
    
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      return {
        dependencies: packageJson.dependencies || {},
        devDependencies: packageJson.devDependencies || {},
        peerDependencies: packageJson.peerDependencies || {}
      };
    }
    
    return {};
  }

  private async findImportDependencies(_projectPath: string): Promise<string[]> {
    // Simplified implementation for now
    return [];
  }

  private async findSystemDependencies(_projectPath: string): Promise<string[]> {
    // Simplified implementation for now
    return [];
  }

  private async initReactProject(projectPath: string, projectName: string): Promise<any> {
    // Create basic React project structure
    await fs.ensureDir(path.join(projectPath, 'src'));
    await fs.ensureDir(path.join(projectPath, 'public'));
    
    const packageJson = {
      name: projectName,
      version: '1.0.0',
      private: true,
      dependencies: {
        react: '^18.0.0',
        'react-dom': '^18.0.0'
      },
      scripts: {
        start: 'react-scripts start',
        build: 'react-scripts build',
        test: 'react-scripts test'
      }
    };
    
    await fs.writeJson(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });
    
    return { projectPath, type: 'react', created: true };
  }

  private async initNodeProject(projectPath: string, projectName: string): Promise<any> {
    const packageJson = {
      name: projectName,
      version: '1.0.0',
      main: 'index.js',
      scripts: {
        start: 'node index.js',
        dev: 'nodemon index.js'
      }
    };
    
    await fs.writeJson(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });
    
    return { projectPath, type: 'node', created: true };
  }

  private async initPythonProject(projectPath: string, _projectName: string): Promise<any> {
    await fs.writeFile(path.join(projectPath, 'requirements.txt'), '# Project dependencies\n');
    await fs.writeFile(path.join(projectPath, 'main.py'), '#!/usr/bin/env python3\n\nif __name__ == "__main__":\n    print("Hello, World!")\n');
    
    return { projectPath, type: 'python', created: true };
  }

  private async initGenericProject(projectPath: string, projectName: string): Promise<any> {
    await fs.writeFile(path.join(projectPath, 'README.md'), `# ${projectName}\n\nProject description here.\n`);
    
    return { projectPath, type: 'generic', created: true };
  }

  private generateGitignoreContent(projectType: string, additional: string[]): string {
    const common = [
      '# Dependencies',
      'node_modules/',
      '',
      '# Logs',
      '*.log',
      'logs/',
      '',
      '# Runtime data',
      'pids/',
      '*.pid',
      '*.seed',
      '',
      '# Environment variables',
      '.env',
      '.env.local',
      '',
      '# IDE',
      '.vscode/',
      '.idea/',
      '',
      '# OS generated files',
      '.DS_Store',
      'Thumbs.db'
    ];
    
    const typeSpecific: Record<string, string[]> = {
      node: ['dist/', 'build/', '*.tsbuildinfo'],
      react: ['build/', '.eslintcache'],
      python: ['__pycache__/', '*.pyc', '.pytest_cache/', 'venv/'],
      java: ['target/', '*.class', '*.jar']
    };
    
    const specific = typeSpecific[projectType.toLowerCase()] || [];
    const all = [...common, '', `# ${projectType} specific`, ...specific, '', '# Additional', ...additional];
    
    return all.join('\n');
  }

  private async formatCode(code: string, _language: string, _config?: any): Promise<string> {
    // Simplified code formatting - in reality would use prettier, black, etc.
    return code;
  }

  private getDiff(_original: string, _formatted: string): string[] {
    // Simplified diff - in reality would use proper diff algorithm
    return [];
  }

  private async searchInFiles(_pattern: string, _searchPath: string, _filePattern?: string, _caseSensitive?: boolean): Promise<any[]> {
    // Simplified search implementation
    return [];
  }
}
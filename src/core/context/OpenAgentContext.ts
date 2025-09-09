/**
 * Copyright (c) 2025 OpenAgent Team
 * Licensed under the MIT License
 * 
 * OpenAgent Context Manager - OPENAGENT.MD file system implementation
 * Inspired by Claude Code's CLAUDE.md system for persistent project context
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { ProjectAnalyzer } from './ProjectAnalyzer.js';

export interface OpenAgentConfig {
  projectOverview?: string;
  techStack?: string[];
  architecture?: string;
  commands?: { [key: string]: string };
  codeStyle?: string[];
  workflow?: string[];
  rules?: string[];
  fileStructure?: string[];
  criticalFiles?: string[];
  dependencies?: string[];
  testingStrategy?: string;
  deploymentInfo?: string;
  customInstructions?: string[];
}

export interface ContextFile {
  path: string;
  content: string;
  config: OpenAgentConfig;
  lastModified: Date;
}

export class OpenAgentContext {
  private projectRoot: string;
  private contextFiles: ContextFile[] = [];
  private analyzer: ProjectAnalyzer;
  private isLoaded = false;

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
    this.analyzer = new ProjectAnalyzer(projectRoot);
  }

  /**
   * Initialize and load all OPENAGENT.MD files in the project hierarchy
   */
  async initialize(): Promise<void> {
   // console.log('🔍 Loading OpenAgent context files...');
    
    // Find all OPENAGENT.MD files
    await this.discoverContextFiles();
    
    // Load and parse each file
    await this.loadContextFiles();
    
    this.isLoaded = true;
   // console.log(`✅ Loaded ${this.contextFiles.length} OpenAgent context files`);
  }

  /**
   * Get the combined context for the current project
   */
  async getProjectContext(): Promise<string> {
    if (!this.isLoaded) {
      await this.initialize();
    }

    if (this.contextFiles.length === 0) {
      return this.generateDefaultContext();
    }

    // Combine all context files with hierarchical precedence
    return this.combineContextFiles();
  }

  /**
   * Generate initial OPENAGENT.MD file (equivalent to Claude Code's /init)
   */
  async generateInitialContext(outputPath?: string): Promise<string> {
    console.log('🔧 Generating initial OpenAgent context...');
    
    const targetPath = outputPath || path.join(this.projectRoot, 'OPENAGENT.MD');
    
    // Analyze project structure
    const projectStructure = await this.analyzer.analyze();
    const packageInfo = await this.getPackageInfo();
    
    
    const contextContent = await this.generateContextFromAnalysis(
      projectStructure, 
      packageInfo
      
    );
    
    await fs.writeFile(targetPath, contextContent, 'utf8');
    console.log(`✅ Generated OPENAGENT.MD at ${targetPath}`);
    
    return contextContent;
  }

  /**
   * Add new instruction to existing context (equivalent to Claude Code's # command)
   */
  async addInstruction(instruction: string, section: string = 'rules'): Promise<void> {
    const mainContextPath = path.join(this.projectRoot, 'OPENAGENT.MD');
    
    try {
      let content = await fs.readFile(mainContextPath, 'utf8');
      
      // Add instruction to appropriate section
      content = this.insertInstructionIntoContext(content, instruction, section);
      
      await fs.writeFile(mainContextPath, content, 'utf8');
      console.log(`✅ Added instruction to ${section}: ${instruction}`);
      
      // Reload context
      this.isLoaded = false;
      await this.initialize();
      
    } catch (error) {
      // If no OPENAGENT.MD exists, create one with this instruction
      await this.generateInitialContext();
      await this.addInstruction(instruction, section);
    }
  }

  /**
   * Update context file with new content
   */
  async updateContext(filePath: string, newContent: string): Promise<void> {
    await fs.writeFile(filePath, newContent, 'utf8');
    
    // Reload context
    this.isLoaded = false;
    await this.initialize();
  }

  /**
   * Get context for specific directory or file
   */
  async getContextForPath(targetPath: string): Promise<string> {
    if (!this.isLoaded) {
      await this.initialize();
    }

    // Find most specific context file for this path
    const relevantFiles = this.contextFiles.filter(file => {
      const contextDir = path.dirname(file.path);
      const relativePath = path.relative(contextDir, targetPath);
      return !relativePath.startsWith('..');
    }).sort((a, b) => {
      // Sort by specificity (deeper paths first)
      return path.dirname(b.path).split(path.sep).length - 
             path.dirname(a.path).split(path.sep).length;
    });

    if (relevantFiles.length === 0) {
      return await this.getProjectContext();
    }

    return this.combineSpecificContextFiles(relevantFiles);
  }

  /**
   * Discover all OPENAGENT.MD files in project hierarchy
   */
  private async discoverContextFiles(): Promise<void> {
    const contextFiles: string[] = [];
    
    // Check for OPENAGENT.MD files
    await this.findContextFiles(this.projectRoot, contextFiles);
    
    // Also check for .clinerules files (compatibility)
    await this.findClinerules(this.projectRoot, contextFiles);
    
    this.contextFiles = [];
    for (const filePath of contextFiles) {
      try {
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf8');
        const config = this.parseContextFile(content);
        
        this.contextFiles.push({
          path: filePath,
          content,
          config,
          lastModified: stats.mtime
        });
      } catch (error) {
        console.warn(`Failed to load context file: ${filePath}`);
      }
    }
  }

  private async findContextFiles(dirPath: string, found: string[]): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath);
      
      // Check for OPENAGENT.MD files
      const contextFiles = ['OPENAGENT.MD', 'openagent.md', 'OPENAGENT.md'];
      for (const fileName of contextFiles) {
        if (entries.includes(fileName)) {
          found.push(path.join(dirPath, fileName));
        }
      }
      
      // Recursively check subdirectories (but skip common ignore patterns)
      for (const entry of entries) {
        if (this.shouldSkipDirectory(entry)) continue;
        
        const fullPath = path.join(dirPath, entry);
        try {
          const stats = await fs.stat(fullPath);
          if (stats.isDirectory()) {
            await this.findContextFiles(fullPath, found);
          }
        } catch (error) {
          // Skip files we can't access
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  private async findClinerules(dirPath: string, found: string[]): Promise<void> {
    try {
      const clinerulePath = path.join(dirPath, '.clinerules', 'main.md');
      await fs.access(clinerulePath);
      found.push(clinerulePath);
    } catch (error) {
      // .clinerules not found, that's okay
    }
  }

  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = [
      'node_modules', 'dist', 'build', '.git', 
      '.next', '.nuxt', 'coverage', '.pytest_cache',
      '__pycache__', 'venv', '.venv', 'env'
    ];
    
    return skipDirs.includes(dirName) || dirName.startsWith('.') && 
           !dirName.startsWith('.openagent') && !dirName.startsWith('.clinerules');
  }

  /**
   * Load and parse all discovered context files
   */
  private async loadContextFiles(): Promise<void> {
    // Context files are already loaded in discoverContextFiles
    // Sort by hierarchy (root files first, then deeper files)
    this.contextFiles.sort((a, b) => {
      const depthA = path.relative(this.projectRoot, a.path).split(path.sep).length;
      const depthB = path.relative(this.projectRoot, b.path).split(path.sep).length;
      return depthA - depthB;
    });
  }

  /**
   * Parse OPENAGENT.MD file content into structured config
   */
  private parseContextFile(content: string): OpenAgentConfig {
    const config: OpenAgentConfig = {};
    const lines = content.split('\n');
    let currentSection = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      if (line.startsWith('# ')) {
        // Process previous section
        if (currentSection && currentContent.length > 0) {
          this.parseSection(config, currentSection, currentContent);
        }
        
        currentSection = line.substring(2).toLowerCase().trim();
        currentContent = [];
      } else if (line.startsWith('## ')) {
        // Process previous section
        if (currentSection && currentContent.length > 0) {
          this.parseSection(config, currentSection, currentContent);
        }
        
        currentSection = line.substring(3).toLowerCase().trim();
        currentContent = [];
      } else if (line.trim()) {
        currentContent.push(line.trim());
      }
    }

    // Process final section
    if (currentSection && currentContent.length > 0) {
      this.parseSection(config, currentSection, currentContent);
    }

    return config;
  }

  private parseSection(config: OpenAgentConfig, section: string, content: string[]): void {
    const contentText = content.join('\n').trim();
    
    switch (section) {
      case 'project overview':
      case 'overview':
        config.projectOverview = contentText;
        break;
      case 'tech stack':
      case 'technology stack':
        config.techStack = content.filter(line => line.startsWith('- ')).map(line => line.substring(2));
        break;
      case 'architecture':
        config.architecture = contentText;
        break;
      case 'commands':
        config.commands = this.parseCommands(content);
        break;
      case 'code style':
      case 'coding standards':
        config.codeStyle = content.filter(line => line.startsWith('- ')).map(line => line.substring(2));
        break;
      case 'workflow':
        config.workflow = content.filter(line => line.startsWith('- ')).map(line => line.substring(2));
        break;
      case 'rules':
      case 'guidelines':
        config.rules = content.filter(line => line.startsWith('- ')).map(line => line.substring(2));
        break;
      case 'file structure':
      case 'project structure':
        config.fileStructure = content;
        break;
      case 'critical files':
      case 'important files':
        config.criticalFiles = content.filter(line => line.startsWith('- ')).map(line => line.substring(2));
        break;
      case 'dependencies':
        config.dependencies = content.filter(line => line.startsWith('- ')).map(line => line.substring(2));
        break;
      case 'testing':
      case 'testing strategy':
        config.testingStrategy = contentText;
        break;
      case 'deployment':
        config.deploymentInfo = contentText;
        break;
      case 'custom instructions':
      case 'additional instructions':
        config.customInstructions = content.filter(line => line.startsWith('- ')).map(line => line.substring(2));
        break;
    }
  }

  private parseCommands(content: string[]): { [key: string]: string } {
    const commands: { [key: string]: string } = {};
    
    for (const line of content) {
      if (line.includes(':') && line.startsWith('- ')) {
        const parts = line.substring(2).split(':');
        if (parts.length >= 2 && parts[0]) {
          commands[parts[0].trim()] = parts.slice(1).join(':').trim();
        }
      }
    }
    
    return commands;
  }

  /**
   * Generate default context when no OPENAGENT.MD files exist
   */
  private async generateDefaultContext(): Promise<string> {
    return `# OpenAgent Project Context

This project is being analyzed by OpenAgent. No OPENAGENT.MD file found.
Use 'openagent init' to generate a comprehensive project context file.

## Basic Information
- Project root: ${path.basename(this.projectRoot)}
- Analysis date: ${new Date().toISOString()}

## Next Steps
1. Run 'openagent init' to analyze your project
2. Customize the generated OPENAGENT.MD file
3. Add project-specific rules and guidelines
`;
  }

  /**
   * Combine all context files into a single context string
   */
  private combineContextFiles(): string {
    let combinedContext = '';
    
    // Add global context first (root-level files)
    const rootFiles = this.contextFiles.filter(file => 
      path.dirname(file.path) === this.projectRoot
    );
    
    for (const file of rootFiles) {
      combinedContext += this.formatContextFile(file) + '\n\n';
    }
    
    // Add directory-specific context
    const directoryFiles = this.contextFiles.filter(file => 
      path.dirname(file.path) !== this.projectRoot
    );
    
    for (const file of directoryFiles) {
      const relativePath = path.relative(this.projectRoot, path.dirname(file.path));
      combinedContext += `## Context for ${relativePath}\n\n`;
      combinedContext += this.formatContextFile(file) + '\n\n';
    }
    
    return combinedContext.trim();
  }

  private combineSpecificContextFiles(files: ContextFile[]): string {
    return files.map(file => this.formatContextFile(file)).join('\n\n');
  }

  private formatContextFile(file: ContextFile): string {
    return file.content;
  }

  /**
   * Generate context content from project analysis
   */
  private async generateContextFromAnalysis(
    structure: any,
    packageInfo: any,
  
  ): Promise<string> {
    const template = `# OPENAGENT.MD
*OpenAgent Project Context - Auto-generated on ${new Date().toISOString()}*

## Project Overview
${this.generateProjectOverview(packageInfo)}

## Tech Stack
${this.generateTechStack(packageInfo)}

## Architecture
${this.generateArchitecture(structure)}

## Commands
${this.generateCommands(packageInfo)}

## File Structure
${this.generateFileStructure(structure)}

## Code Style
- Follow project's existing patterns
- Use TypeScript where applicable
- Write comprehensive tests
- Maintain consistent naming conventions

## Workflow
- Analyze before implementing changes
- Run tests after modifications
- Update documentation when needed
- Follow git best practices

## Rules
- Never modify core configuration without explicit instruction
- Always validate changes before committing
- Prioritize code readability and maintainability
- Follow security best practices

## Testing Strategy
${this.generateTestingStrategy(packageInfo)}

## Critical Files
${this.generateCriticalFiles()}

## Custom Instructions
- Maintain compatibility with existing codebase
- Consider performance implications
- Update this file when project structure changes
`;

    return template;
  }

  private generateProjectOverview(packageInfo: any): string {
    let overview = `Project: ${path.basename(this.projectRoot)}\n`;
    
    if (packageInfo?.description) {
      overview += `Description: ${packageInfo.description}\n`;
    }
    
    if (packageInfo?.version) {
      overview += `Version: ${packageInfo.version}\n`;
    }
    
   
    
    return overview;
  }

  private generateTechStack(packageInfo: any): string {
    const stack: string[] = [];
    
    if (packageInfo?.dependencies) {
      const deps = Object.keys(packageInfo.dependencies);
      
      // Detect major frameworks and technologies
      if (deps.includes('react')) stack.push('- React');
      if (deps.includes('vue')) stack.push('- Vue.js');
      if (deps.includes('angular')) stack.push('- Angular');
      if (deps.includes('next')) stack.push('- Next.js');
      if (deps.includes('nuxt')) stack.push('- Nuxt.js');
      if (deps.includes('express')) stack.push('- Express.js');
      if (deps.includes('fastify')) stack.push('- Fastify');
      if (deps.includes('typescript')) stack.push('- TypeScript');
      if (deps.includes('tailwindcss')) stack.push('- Tailwind CSS');
      if (deps.includes('jest')) stack.push('- Jest');
      if (deps.includes('vitest')) stack.push('- Vitest');
      if (deps.includes('webpack')) stack.push('- Webpack');
      if (deps.includes('vite')) stack.push('- Vite');
    }
    
    // Check for configuration files to detect more technologies
    // This would be expanded with actual file checking
    
    return stack.length > 0 ? stack.join('\n') : '- Node.js (detected)';
  }

  private generateArchitecture(structure: any): string {
    return `Based on project structure analysis:
- Total files: ${structure?.totalFiles || 'Unknown'}
- Main directories: ${structure?.tree?.children?.length || 0}
- Dependencies analyzed: ${Object.keys(structure?.dependencies || {}).length}

This appears to be a ${this.detectProjectType()} project.`;
  }

  private detectProjectType(): string {
    // This would be more sophisticated in real implementation
    return 'TypeScript/Node.js';
  }

  private generateCommands(packageInfo: any): string {
    if (packageInfo?.scripts) {
      return Object.entries(packageInfo.scripts as Record<string, string>)
        .map(([name, cmd]) => `- ${name}: ${cmd}`)
        .join('\n');
    }
    
    return '- No package.json scripts detected';
  }

  private generateFileStructure(structure: any): string {
    if (structure?.tree?.children) {
      return structure.tree.children
        .filter((child: any) => child.type === 'directory')
        .map((dir: any) => `- ${dir.name}/: ${this.getDirectoryDescription(dir.name)}`)
        .join('\n');
    }
    
    return 'Project structure analysis in progress...';
  }

  private getDirectoryDescription(dirName: string): string {
    const descriptions: { [key: string]: string } = {
      'src': 'Main source code',
      'lib': 'Library code',
      'components': 'Reusable components',
      'pages': 'Page components',
      'utils': 'Utility functions',
      'types': 'TypeScript type definitions',
      'tests': 'Test files',
      'docs': 'Documentation',
      'public': 'Static assets',
      'assets': 'Project assets',
      'config': 'Configuration files',
      'scripts': 'Build and utility scripts'
    };
    
    return descriptions[dirName] || 'Project directory';
  }

  private generateTestingStrategy(packageInfo: any): string {
    if (packageInfo?.dependencies) {
      const deps = Object.keys(packageInfo.dependencies as Record<string, string>);
      
      if (deps.includes('jest')) {
        return 'Jest testing framework detected. Run tests with npm test.';
      } else if (deps.includes('vitest')) {
        return 'Vitest framework detected. Modern testing setup.';
      } else if (deps.includes('mocha')) {
        return 'Mocha testing framework detected.';
      }
    }
    
    return 'No testing framework detected. Consider adding Jest or Vitest.';
  }

  private generateCriticalFiles(): string {
    const criticalFiles = [
      'package.json',
      'tsconfig.json',
      'README.md',
      '.gitignore',
      'src/index.ts',
      'src/main.ts'
    ];
    
    return criticalFiles
      .map(file => `- ${file}: ${this.getCriticalFileDescription(file)}`)
      .join('\n');
  }

  private getCriticalFileDescription(fileName: string): string {
    const descriptions: { [key: string]: string } = {
      'package.json': 'Project dependencies and scripts',
      'tsconfig.json': 'TypeScript configuration',
      'README.md': 'Project documentation',
      '.gitignore': 'Git ignore patterns',
      'src/index.ts': 'Main entry point',
      'src/main.ts': 'Application entry point'
    };
    
    return descriptions[fileName] || 'Important project file';
  }

  private async getPackageInfo(): Promise<any> {
    try {
      const packagePath = path.join(this.projectRoot, 'package.json');
      const content = await fs.readFile(packagePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

 

  /**
   * Insert instruction into appropriate section of context file
   */
  private insertInstructionIntoContext(
    content: string, 
    instruction: string, 
    section: string
  ): string {
    const lines = content.split('\n');
    const sectionHeader = `## ${section.charAt(0).toUpperCase() + section.slice(1)}`;
    
    // Find the section
    const sectionIndex = lines.findIndex(line => 
      line.toLowerCase().startsWith('## ' + section.toLowerCase())
    );
    
    if (sectionIndex !== -1) {
        // Find next section or end of file
        let nextSectionIndex = lines.length;
        for (let i = sectionIndex + 1; i < lines.length; i++) {
          const line = lines[i];
          if (line && line.startsWith('## ')) {
            nextSectionIndex = i;
            break;
          }
        }
      
      // Insert instruction before next section
      lines.splice(nextSectionIndex, 0, `- ${instruction}`);
    } else {
      // Add new section at the end
      lines.push('', sectionHeader, `- ${instruction}`);
    }
    
    return lines.join('\n');
  }
}

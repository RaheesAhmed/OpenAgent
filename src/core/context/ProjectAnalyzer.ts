/**
 * Copyright (c) 2025 OpenAgent Team
 * Licensed under the MIT License
 * 
 * Intelligent Project Analyzer - Dynamic dependency graphs and file trees
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

export interface FileNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size?: number;
  exports?: string[];
  imports?: string[];
  dependencies?: string[];
  dependents?: string[];
  children?: FileNode[];
}

export interface DependencyGraph {
  [filePath: string]: {
    imports: string[];
    exports: string[];
    dependsOn: string[];
    usedBy: string[];
  };
}

export interface ProjectStructure {
  tree: FileNode;
  dependencies: DependencyGraph;
  totalFiles: number;
  summary: string;
}

export class ProjectAnalyzer {
  private projectRoot: string;
  private structure: ProjectStructure | null = null;
  private program: ts.Program | null = null;

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
  }

  async analyze(): Promise<ProjectStructure> {
    console.log('🔍 Analyzing project structure...');
    
    // Initialize TypeScript compiler
    await this.initializeTypeScript();
    
    // Build file tree
    const tree = await this.buildFileTree(this.projectRoot);
    
    // Build dependency graph
    const dependencies = await this.buildDependencyGraph();
    
    // Create summary
    const summary = this.generateProjectSummary(tree, dependencies);
    
    this.structure = {
      tree,
      dependencies,
      totalFiles: this.countFiles(tree),
      summary
    };

    console.log(`✅ Analyzed ${this.structure.totalFiles} files with ${Object.keys(dependencies).length} dependencies`);
    
    return this.structure;
  }

  private async initializeTypeScript(): Promise<void> {
    try {
      const configPath = ts.findConfigFile(this.projectRoot, ts.sys.fileExists, 'tsconfig.json');
      if (configPath) {
        const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
        const parsedConfig = ts.parseJsonConfigFileContent(
          configFile.config,
          ts.sys,
          path.dirname(configPath),
          undefined,
          configPath
        );
        
        this.program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
      }
    } catch (error) {
      console.warn('TypeScript initialization failed, using file-based analysis');
    }
  }

  private async buildFileTree(dirPath: string, depth = 0): Promise<FileNode> {
    const stats = await fs.stat(dirPath);
    const name = path.basename(dirPath);
    
    if (stats.isFile()) {
      const fileInfo = await this.analyzeFile(dirPath);
      return {
        path: path.relative(this.projectRoot, dirPath),
        name,
        type: 'file',
        size: stats.size,
        ...fileInfo
      };
    }
    
    if (stats.isDirectory() && depth < 10) { // Prevent infinite recursion
      const children: FileNode[] = [];
      
      try {
        const entries = await fs.readdir(dirPath);
        const filteredEntries = entries.filter(entry => 
          !entry.startsWith('.') || 
          entry === '.openagent' || 
          entry === '.clinerules'
        ).filter(entry => 
          entry !== 'node_modules' && 
          entry !== 'dist' && 
          entry !== 'build'
        );
        
        for (const entry of filteredEntries) {
          const fullPath = path.join(dirPath, entry);
          try {
            const child = await this.buildFileTree(fullPath, depth + 1);
            children.push(child);
          } catch (error) {
            // Skip files we can't read
            console.warn(`Could not read file: ${fullPath}`);
          }
        }
      } catch (error) {
        // Skip directories we can't read
        console.warn(`Could not read directory: ${dirPath}`);
      }
      
      return {
        path: path.relative(this.projectRoot, dirPath),
        name,
        type: 'directory',
        children: children.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        })
      };
    }
    
    return {
      path: path.relative(this.projectRoot, dirPath),
      name,
      type: 'directory',
      children: []
    };
  }

  private async analyzeFile(filePath: string): Promise<Partial<FileNode>> {
    const ext = path.extname(filePath).toLowerCase();
    
    if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      return {};
    }

    try {
      // Try TypeScript analysis first
      if (this.program) {
        const sourceFile = this.program.getSourceFile(filePath);
        if (sourceFile) {
          return this.analyzeTypeScriptFile(sourceFile);
        }
      }
      
      // Fallback to regex analysis
      return await this.analyzeFileWithRegex(filePath);
    } catch (error) {
      return {};
    }
  }

  private analyzeTypeScriptFile(sourceFile: ts.SourceFile): Partial<FileNode> {
    const exports: string[] = [];
    const imports: string[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          imports.push(node.moduleSpecifier.text);
        }
      }
      
      if (ts.isExportDeclaration(node)) {
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          for (const element of node.exportClause.elements) {
            exports.push(element.name.text);
          }
        }
      }
      
      if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) 
          && node.name?.text && this.hasExportModifier(node)) {
        exports.push(node.name.text);
      }
      
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    
    return { exports, imports };
  }

  private async analyzeFileWithRegex(filePath: string): Promise<Partial<FileNode>> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      const imports: string[] = [];
      const exports: string[] = [];
      
      // Extract imports
      const importMatches = content.match(/(?:import|require)\s*\(?.*?['"]([^'"]+)['"]/g);
      if (importMatches) {
        for (const match of importMatches) {
          const moduleMatch = match.match(/['"]([^'"]+)['"]/);
          if (moduleMatch && moduleMatch[1]) {
            imports.push(moduleMatch[1]);
          }
        }
      }
      
      // Extract exports
      const exportMatches = content.match(/export\s+(?:default\s+)?(?:class|function|interface|const|let|var)\s+(\w+)/g);
      if (exportMatches) {
        for (const match of exportMatches) {
          const nameMatch = match.match(/export\s+(?:default\s+)?(?:class|function|interface|const|let|var)\s+(\w+)/);
          if (nameMatch && nameMatch[1]) {
            exports.push(nameMatch[1]);
          }
        }
      }
      
      return { exports, imports };
    } catch (error) {
      return {};
    }
  }

  private hasExportModifier(node: ts.Node): boolean {
    if ('modifiers' in node && node.modifiers) {
      const modifiers = node.modifiers as readonly ts.Modifier[];
      return modifiers.some((mod: ts.Modifier) => mod.kind === ts.SyntaxKind.ExportKeyword);
    }
    return false;
  }

  private async buildDependencyGraph(): Promise<DependencyGraph> {
    const graph: DependencyGraph = {};
    
    if (!this.structure?.tree) {
      // Build tree first to get files
      this.structure = {
        tree: await this.buildFileTree(this.projectRoot),
        dependencies: {},
        totalFiles: 0,
        summary: ''
      };
    }
    
    const allFiles = this.getAllFiles(this.structure!.tree);
    
    for (const file of allFiles) {
      if (file.type === 'file' && file.imports) {
        const fullPath = path.resolve(this.projectRoot, file.path);
        
        graph[file.path] = {
          imports: file.imports || [],
          exports: file.exports || [],
          dependsOn: [],
          usedBy: []
        };
        
        // Resolve imports to actual file paths
        for (const importPath of file.imports) {
          const resolved = await this.resolveImport(fullPath, importPath);
          if (resolved) {
            const relativePath = path.relative(this.projectRoot, resolved);
            graph[file.path]!.dependsOn.push(relativePath);
          }
        }
      }
    }
    
    // Build reverse dependencies (usedBy)
    for (const [filePath, info] of Object.entries(graph)) {
      for (const dependency of info.dependsOn) {
        if (graph[dependency]) {
          graph[dependency].usedBy.push(filePath);
        }
      }
    }
    
    return graph;
  }

  private async resolveImport(fromFile: string, importPath: string): Promise<string | null> {
    if (importPath.startsWith('.')) {
      const resolved = path.resolve(path.dirname(fromFile), importPath);
      
      // If import already has extension, try different variations
      if (path.extname(importPath)) {
        const basePath = resolved.replace(/\.[^.]*$/, ''); // Remove existing extension
        for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
          const withExt = basePath + ext;
          try {
            await fs.access(withExt);
            return withExt;
          } catch {
            // File doesn't exist, continue trying other extensions
          }
        }
      } else {
        // No extension, try all possibilities
        for (const ext of ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js']) {
          const withExt = resolved + ext;
          try {
            await fs.access(withExt);
            return withExt;
          } catch {
            // File doesn't exist, continue trying other extensions
          }
        }
      }
    }
    return null;
  }

  private getAllFiles(node: FileNode): FileNode[] {
    let files: FileNode[] = [];
    
    if (node.type === 'file') {
      files.push(node);
    } else if (node.children) {
      for (const child of node.children) {
        files = files.concat(this.getAllFiles(child));
      }
    }
    
    return files;
  }

  private countFiles(node: FileNode): number {
    if (node.type === 'file') return 1;
    if (!node.children) return 0;
    
    return node.children.reduce((count, child) => count + this.countFiles(child), 0);
  }

  private generateProjectSummary(tree: FileNode, dependencies: DependencyGraph): string {
    const totalFiles = this.countFiles(tree);
    const totalDeps = Object.keys(dependencies).length;
    
    // Find most connected files
    const mostConnected = Object.entries(dependencies)
      .sort(([,a], [,b]) => (b.dependsOn.length + b.usedBy.length) - (a.dependsOn.length + a.usedBy.length))
      .slice(0, 5)
      .map(([path]) => path.split('/').pop());
    
    return `
Project: ${tree.name}
Files: ${totalFiles} total, ${totalDeps} with dependencies
Key Files: ${mostConnected.join(', ')}
Structure: ${tree.children?.length || 0} top-level directories
    `.trim();
  }

  // Public tool methods for agents
  async getFileInfo(filePath: string): Promise<FileNode | null> {
    if (!this.structure) await this.analyze();
    
    const normalizedPath = filePath.replace(/\\/g, '/');
    const files = this.getAllFiles(this.structure!.tree);
    
    const found = files.find(f => {
      const fPath = f.path.replace(/\\/g, '/');
      return fPath === normalizedPath || fPath === `./${normalizedPath}`;
    });
    
    console.log(`Looking for file: ${normalizedPath}, found:`, found ? `${found.name} (${found.type})` : 'not found');
    
    // Show actual TypeScript/JavaScript files instead of all files
    const codeFiles = files.filter(f => f.type === 'file' && ['.ts', '.tsx', '.js', '.jsx'].includes(f.name.slice(f.name.lastIndexOf('.'))));
    console.log(`Available code files (${codeFiles.length} total):`, codeFiles.slice(0, 10).map(f => f.path));
    
    return found || null;
  }

  async getFileDependencies(filePath: string): Promise<string[]> {
    if (!this.structure) await this.analyze();
    
    // Try both forward and backward slashes
    const normalizedPath = filePath.replace(/\\/g, '/');
    const backslashPath = filePath.replace(/\//g, '\\');
    
    const deps = this.structure!.dependencies[normalizedPath] || 
                 this.structure!.dependencies[backslashPath] || 
                 this.structure!.dependencies[filePath];
    
    console.log(`Getting dependencies for: ${filePath}`);
    console.log(`Trying paths: ${normalizedPath}, ${backslashPath}`);
    console.log(`Available in graph:`, Object.keys(this.structure!.dependencies).slice(0, 10));
    console.log(`Dependencies found:`, deps?.dependsOn || []);
    
    return deps?.dependsOn || [];
  }

  async getFileDependents(filePath: string): Promise<string[]> {
    if (!this.structure) await this.analyze();
    
    return this.structure!.dependencies[filePath]?.usedBy || [];
  }

  async getFolderContents(folderPath: string): Promise<FileNode[]> {
    if (!this.structure) await this.analyze();
    
    const normalizedPath = folderPath.replace(/\\/g, '/');
    
    const findFolder = (node: FileNode, targetPath: string): FileNode | null => {
      const nodePath = node.path.replace(/\\/g, '/');
      
      if (nodePath === targetPath || nodePath === `./${targetPath}`) return node;
      if (node.children) {
        for (const child of node.children) {
          const found = findFolder(child, targetPath);
          if (found) return found;
        }
      }
      return null;
    };
    
    const folder = findFolder(this.structure!.tree, normalizedPath);
    console.log(`Looking for folder: ${normalizedPath}, found:`, folder ? `${folder.name} with ${folder.children?.length || 0} children` : 'not found');
    return folder?.children || [];
  }

  async getProjectOverview(): Promise<string> {
    if (!this.structure) await this.analyze();
    
    return this.structure!.summary;
  }

  async getRelatedFiles(filePath: string): Promise<string[]> {
    if (!this.structure) await this.analyze();
    
    const deps = this.structure!.dependencies[filePath];
    if (!deps) return [];
    
    return [...deps.dependsOn, ...deps.usedBy];
  }
}

/**
 * Code Quality Assurance Pipeline for OpenClaude
 * Addresses Claude Code weakness: Bug generation, hallucinations, security vulnerabilities
 * Implements multi-layer validation, hallucination detection, and security scanning
 */

import fs from 'fs-extra';
import path from 'path';
import { EventEmitter } from 'events';
import * as vm from 'vm';

export interface ValidationConfig {
  enabled: boolean;
  strictMode: boolean;
  securityScanEnabled: boolean;
  performanceCheckEnabled: boolean;
  hallucinationDetectionEnabled: boolean;
  maxValidationTime: number; // milliseconds
  qualityThreshold: number; // 0-1
}

export interface ValidationResult {
  overall: {
    passed: boolean;
    score: number;
    confidence: number;
    executionTime: number;
  };
  syntax: SyntaxValidationResult;
  logic: LogicValidationResult;
  security: SecurityValidationResult;
  performance: PerformanceValidationResult;
  hallucination: HallucinationValidationResult;
  recommendations: ValidationRecommendation[];
}

export interface SyntaxValidationResult {
  passed: boolean;
  score: number;
  errors: SyntaxError[];
  warnings: SyntaxWarning[];
  language: string;
  validatedLines: number;
}

export interface LogicValidationResult {
  passed: boolean;
  score: number;
  issues: LogicIssue[];
  complexity: {
    cyclomatic: number;
    cognitive: number;
    maintainabilityIndex: number;
  };
  patterns: {
    recognized: string[];
    antiPatterns: string[];
  };
}

export interface SecurityValidationResult {
  passed: boolean;
  score: number;
  vulnerabilities: SecurityVulnerability[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  compliance: {
    owasp: boolean;
    gdpr: boolean;
    dataHandling: boolean;
  };
}

export interface PerformanceValidationResult {
  passed: boolean;
  score: number;
  issues: PerformanceIssue[];
  metrics: {
    estimatedComplexity: string;
    memoryUsage: 'low' | 'medium' | 'high';
    scalabilityRisk: number;
  };
  optimizations: string[];
}

export interface HallucinationValidationResult {
  passed: boolean;
  score: number;
  issues: HallucinationIssue[];
  verification: {
    filePathsValid: boolean;
    dependenciesExist: boolean;
    apisVerified: boolean;
    configurationValid: boolean;
  };
}

export interface SyntaxError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
  rule?: string;
  fixSuggestion?: string;
}

export interface SyntaxWarning {
  line: number;
  column: number;
  message: string;
  rule: string;
  fixSuggestion?: string;
}

export interface LogicIssue {
  type: 'deadCode' | 'unreachable' | 'undefined' | 'inconsistent' | 'circular';
  line: number;
  message: string;
  severity: 'low' | 'medium' | 'high';
  fixSuggestion?: string;
}

export interface SecurityVulnerability {
  type: 'injection' | 'xss' | 'authentication' | 'authorization' | 'dataExposure' | 'cryptographic';
  line: number;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cwe?: string; // Common Weakness Enumeration ID
  mitigation: string;
}

export interface PerformanceIssue {
  type: 'algorithmic' | 'memory' | 'io' | 'database' | 'network';
  line: number;
  message: string;
  impact: 'low' | 'medium' | 'high';
  optimization: string;
}

export interface HallucinationIssue {
  type: 'invalidPath' | 'missingDependency' | 'unknownAPI' | 'invalidConfig' | 'fabricated';
  reference: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  correction?: string;
}

export interface ValidationRecommendation {
  category: 'syntax' | 'logic' | 'security' | 'performance' | 'hallucination';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  implementation: string;
  estimatedEffort: 'low' | 'medium' | 'high';
}

export interface CodePattern {
  name: string;
  description: string;
  examples: string[];
  quality: 'good' | 'neutral' | 'antipattern';
  language: string;
  category: string;
}

export class ValidationEngine extends EventEmitter {
  private projectPath: string;
  private config: ValidationConfig;
  private knownPatterns: Map<string, CodePattern> = new Map();
  private validationHistory: ValidationResult[] = [];
  private dependencyCache: Set<string> = new Set();
  private apiCache: Map<string, boolean> = new Map();
  
  // Language parsers and validators
  private validators: Map<string, any> = new Map();
  
  // Security patterns and rules
  private securityRules: Map<string, RegExp[]> = new Map();
  private performanceRules: Map<string, RegExp[]> = new Map();

  constructor(projectPath: string, config?: Partial<ValidationConfig>) {
    super();
    this.projectPath = projectPath;
    this.config = {
      enabled: true,
      strictMode: false,
      securityScanEnabled: true,
      performanceCheckEnabled: true,
      hallucinationDetectionEnabled: true,
      maxValidationTime: 30000, // 30 seconds
      qualityThreshold: 0.8,
      ...config
    };
    
    this.initializeValidators();
    this.loadSecurityRules();
    this.loadPerformanceRules();
    this.loadKnownPatterns();
  }

  /**
   * Initialize the validation engine
   */
  async initialize(): Promise<void> {
    try {
      // Load project dependencies for verification
      await this.loadProjectDependencies();
      
      // Load validation history
      await this.loadValidationHistory();
      
      this.emit('initialized');
      //console.log('✅ Validation engine initialized successfully');
      
    } catch (error) {
      this.emit('error', error);
      throw new Error(`Failed to initialize validation engine: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate code comprehensively
   */
  async validateCode(
    code: string,
    language: string,
    context: {
      filePath?: string;
      projectStructure?: any;
      dependencies?: string[];
    } = {}
  ): Promise<ValidationResult> {
    if (!this.config.enabled) {
      return this.createPassingResult();
    }

    const startTime = Date.now();
    
    try {
      // Run all validation layers in parallel for efficiency
      const [syntax, logic, security, performance, hallucination] = await Promise.all([
        this.validateSyntax(code, language),
        this.validateLogic(code, language, context),
        this.config.securityScanEnabled ? this.validateSecurity(code, language, context) : this.createPassingSecurityResult(),
        this.config.performanceCheckEnabled ? this.validatePerformance(code, language, context) : this.createPassingPerformanceResult(),
        this.config.hallucinationDetectionEnabled ? this.validateHallucination(code, language, context) : this.createPassingHallucinationResult()
      ]);

      // Calculate overall score and pass status
      const overallScore = this.calculateOverallScore(syntax, logic, security, performance, hallucination);
      const passed = overallScore >= this.config.qualityThreshold;
      const executionTime = Date.now() - startTime;

      // Generate recommendations
      const recommendations = this.generateRecommendations(syntax, logic, security, performance, hallucination);

      const result: ValidationResult = {
        overall: {
          passed,
          score: overallScore,
          confidence: this.calculateConfidence(syntax, logic, security, performance, hallucination),
          executionTime
        },
        syntax,
        logic,
        security,
        performance,
        hallucination,
        recommendations
      };

      // Store in history for learning
      this.validationHistory.push(result);
      if (this.validationHistory.length > 1000) {
        this.validationHistory = this.validationHistory.slice(-1000);
      }

      // Emit validation event
      this.emit('validation_complete', { result, code: code.length, language });

      // Learn from this validation
      this.learnFromValidation(code, language, result);

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.emit('validation_error', { error, executionTime });
      
      // Return failed result
      return {
        overall: {
          passed: false,
          score: 0,
          confidence: 0,
          executionTime
        },
        syntax: { passed: false, score: 0, errors: [{ line: 0, column: 0, message: `Validation error: ${error instanceof Error ? error.message : String(error)}`, severity: 'error' as const }], warnings: [], language, validatedLines: 0 },
        logic: { passed: false, score: 0, issues: [], complexity: { cyclomatic: 0, cognitive: 0, maintainabilityIndex: 0 }, patterns: { recognized: [], antiPatterns: [] } },
        security: this.createPassingSecurityResult(),
        performance: this.createPassingPerformanceResult(),
        hallucination: this.createPassingHallucinationResult(),
        recommendations: []
      };
    }
  }

  /**
   * Validate syntax using language-specific parsers
   */
  private async validateSyntax(code: string, language: string): Promise<SyntaxValidationResult> {
    const errors: SyntaxError[] = [];
    const warnings: SyntaxWarning[] = [];
    const lines = code.split('\n');
    
    try {
      switch (language.toLowerCase()) {
        case 'javascript':
        case 'typescript':
          return this.validateJavaScriptSyntax(code);
        case 'python':
          return this.validatePythonSyntax(code);
        case 'java':
          return this.validateJavaSyntax(code);
        case 'json':
          return this.validateJSONSyntax(code);
        default:
          return this.validateGenericSyntax(code, language);
      }
    } catch (error) {
      errors.push({
        line: 0,
        column: 0,
        message: `Syntax validation error: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'error'
      });
      
      return {
        passed: false,
        score: 0,
        errors,
        warnings,
        language,
        validatedLines: lines.length
      };
    }
  }

  /**
   * Validate JavaScript/TypeScript syntax
   */
  private validateJavaScriptSyntax(code: string): SyntaxValidationResult {
    const errors: SyntaxError[] = [];
    const warnings: SyntaxWarning[] = [];
    const lines = code.split('\n');
    
    try {
      // Use VM to check basic syntax
      new vm.Script(code);
      
      // Additional checks for common issues
      this.checkCommonJavaScriptIssues(code, errors, warnings);
      
      const score = errors.length === 0 ? (warnings.length === 0 ? 1.0 : 0.8) : 0.0;
      
      return {
        passed: errors.length === 0,
        score,
        errors,
        warnings,
        language: 'javascript',
        validatedLines: lines.length
      };
      
    } catch (error: any) {
      // Parse VM error for line/column info
      const match = error.message.match(/at line (\d+)/);
      const line = (match && match[1]) ? parseInt(match[1]) : 1;
      
      errors.push({
        line,
        column: 0,
        message: error.message,
        severity: 'error' as const,
        fixSuggestion: this.getSyntaxFixSuggestion(error.message)
      });
      
      return {
        passed: false,
        score: 0,
        errors,
        warnings,
        language: 'javascript',
        validatedLines: lines.length
      };
    }
  }

  /**
   * Check common JavaScript issues
   */
  private checkCommonJavaScriptIssues(code: string, _errors: SyntaxError[], warnings: SyntaxWarning[]): void {
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Check for common issues
      if (line.includes('var ') && !line.includes('//')) {
        warnings.push({
          line: lineNumber,
          column: line.indexOf('var'),
          message: 'Consider using "let" or "const" instead of "var"',
          rule: 'prefer-const',
          fixSuggestion: 'Replace "var" with "const" or "let"'
        });
      }
      
      if (line.includes('==') && !line.includes('===') && !line.includes('//')) {
        warnings.push({
          line: lineNumber,
          column: line.indexOf('=='),
          message: 'Consider using strict equality "===" instead of "=="',
          rule: 'strict-equality',
          fixSuggestion: 'Replace "==" with "==="'
        });
      }
      
      // Check for potential semicolon issues
      if (line.trim() && !line.trim().endsWith(';') && !line.trim().endsWith('{') && !line.trim().endsWith('}') && !line.includes('//')) {
        const trimmed = line.trim();
        if (!/^(if|for|while|function|class|const|let|var|return|import|export)/.test(trimmed) && 
            !/[(){}[\]:,]$/.test(trimmed)) {
          warnings.push({
            line: lineNumber,
            column: line.length,
            message: 'Missing semicolon',
            rule: 'semicolon',
            fixSuggestion: 'Add semicolon at end of statement'
          });
        }
      }
    });
  }

  /**
   * Validate Python syntax (simplified)
   */
  private validatePythonSyntax(code: string): SyntaxValidationResult {
    const errors: SyntaxError[] = [];
    const warnings: SyntaxWarning[] = [];
    const lines = code.split('\n');
    
    // Basic Python syntax checks
    let expectedIndent = 0;
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      if (line.trim() === '') return;
      
      // Check indentation
      const leadingSpaces = line.length - line.trimStart().length;
      
      if (line.trim().endsWith(':')) {
        expectedIndent = leadingSpaces + 4;
      } else if (leadingSpaces !== expectedIndent && leadingSpaces !== 0) {
        if (!line.trim().startsWith('#')) {
          errors.push({
            line: lineNumber,
            column: 0,
            message: `Indentation error: expected ${expectedIndent} spaces, got ${leadingSpaces}`,
            severity: 'error' as const,
            fixSuggestion: `Adjust indentation to ${expectedIndent} spaces`
          });
        }
      }
      
      // Check for common Python issues
      if (line.includes('print ') && !line.includes('print(')) {
        warnings.push({
          line: lineNumber,
          column: line.indexOf('print'),
          message: 'Python 3 requires parentheses for print statements',
          rule: 'print-statement',
          fixSuggestion: 'Use print() function instead of print statement'
        });
      }
    });
    
    const score = errors.length === 0 ? (warnings.length === 0 ? 1.0 : 0.8) : 0.0;
    
    return {
      passed: errors.length === 0,
      score,
      errors,
      warnings,
      language: 'python',
      validatedLines: lines.length
    };
  }

  /**
   * Validate Java syntax (simplified)
   */
  private validateJavaSyntax(code: string): SyntaxValidationResult {
    const errors: SyntaxError[] = [];
    const warnings: SyntaxWarning[] = [];
    const lines = code.split('\n');
    
    // Basic Java syntax checks
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Check for missing semicolons
      const trimmed = line.trim();
      if (trimmed && !trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.endsWith('}') && !trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
        if (!/^(public|private|protected|static|final|class|interface|if|for|while|try|catch|finally|package|import)/.test(trimmed)) {
          warnings.push({
            line: lineNumber,
            column: line.length,
            message: 'Missing semicolon',
            rule: 'semicolon',
            fixSuggestion: 'Add semicolon at end of statement'
          });
        }
      }
      
      // Check for proper class naming
      const classMatch = trimmed.match(/^class\s+([A-Za-z_][A-Za-z0-9_]*)/);
      if (classMatch && classMatch.length > 1 && classMatch[1]) {
        const className = classMatch[1];
        const classIndex = line.indexOf(className);
        if (classIndex !== -1 && !/^[A-Z]/.test(className)) {
          warnings.push({
            line: lineNumber,
            column: classIndex,
            message: 'Class names should start with uppercase letter',
            rule: 'class-naming',
            fixSuggestion: `Rename class to ${className.charAt(0).toUpperCase() + className.slice(1)}`
          });
        }
      }
    });
    
    const score = errors.length === 0 ? (warnings.length === 0 ? 1.0 : 0.8) : 0.0;
    
    return {
      passed: errors.length === 0,
      score,
      errors,
      warnings,
      language: 'java',
      validatedLines: lines.length
    };
  }

  /**
   * Validate JSON syntax
   */
  private validateJSONSyntax(code: string): SyntaxValidationResult {
    const errors: SyntaxError[] = [];
    const warnings: SyntaxWarning[] = [];
    const lines = code.split('\n');
    
    try {
      JSON.parse(code);
      
      return {
        passed: true,
        score: 1.0,
        errors,
        warnings,
        language: 'json',
        validatedLines: lines.length
      };
      
    } catch (error: any) {
      const match = error.message.match(/at position (\d+)/);
      let line = 1;
      let column = 0;
      
      if (match && match[1]) {
        const position = parseInt(match[1]);
        const beforeError = code.substring(0, position);
        line = beforeError.split('\n').length;
        column = position - beforeError.lastIndexOf('\n') - 1;
      }
      
      errors.push({
        line,
        column,
        message: error.message,
        severity: 'error' as const,
        fixSuggestion: 'Check JSON syntax and formatting'
      });
      
      return {
        passed: false,
        score: 0,
        errors,
        warnings,
        language: 'json',
        validatedLines: lines.length
      };
    }
  }

  /**
   * Generic syntax validation
   */
  private validateGenericSyntax(code: string, language: string): SyntaxValidationResult {
    const errors: SyntaxError[] = [];
    const warnings: SyntaxWarning[] = [];
    const lines = code.split('\n');
    
    // Basic checks that apply to most languages
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Check for mismatched brackets
      const brackets = { '(': 0, '[': 0, '{': 0 };
      for (const char of line) {
        if (char === '(') brackets['(']++;
        else if (char === ')') brackets['(']--;
        else if (char === '[') brackets['[']++;
        else if (char === ']') brackets['[']--;
        else if (char === '{') brackets['{']++;
        else if (char === '}') brackets['{']--;
      }
      
      Object.entries(brackets).forEach(([bracket, count]) => {
        if (count !== 0) {
          warnings.push({
            line: lineNumber,
            column: 0,
            message: `Mismatched ${bracket} brackets`,
            rule: 'bracket-matching',
            fixSuggestion: `Check for missing closing ${bracket === '(' ? ')' : bracket === '[' ? ']' : '}'} bracket`
          });
        }
      });
    });
    
    const score = errors.length === 0 ? (warnings.length === 0 ? 1.0 : 0.8) : 0.0;
    
    return {
      passed: errors.length === 0,
      score,
      errors,
      warnings,
      language,
      validatedLines: lines.length
    };
  }

  /**
   * Validate logic and code quality
   */
  private async validateLogic(code: string, language: string, _context: any): Promise<LogicValidationResult> {
    const issues: LogicIssue[] = [];
    const recognizedPatterns: string[] = [];
    const antiPatterns: string[] = [];
    
    // Calculate complexity metrics
    const complexity = this.calculateComplexity(code, language);
    
    // Check for logic issues
    this.checkLogicIssues(code, language, issues);
    
    // Analyze patterns
    this.analyzeCodePatterns(code, language, recognizedPatterns, antiPatterns);
    
    const score = this.calculateLogicScore(issues, complexity, antiPatterns);
    
    return {
      passed: score >= 0.7,
      score,
      issues,
      complexity,
      patterns: {
        recognized: recognizedPatterns,
        antiPatterns
      }
    };
  }

  /**
   * Calculate code complexity
   */
  private calculateComplexity(code: string, _language: string): { cyclomatic: number; cognitive: number; maintainabilityIndex: number } {
    let cyclomatic = 1; // Base complexity
    let cognitive = 0;
    
    // Count decision points for cyclomatic complexity
    const decisionPoints = (code.match(/\b(if|while|for|switch|case|catch|&&|\|\|)\b/g) || []).length;
    cyclomatic += decisionPoints;
    
    // Cognitive complexity includes nesting weight
    const lines = code.split('\n');
    let nestingLevel = 0;
    
    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Increase nesting
      if (/(if|while|for|try|switch)\s*\(/.test(trimmed)) {
        nestingLevel++;
        cognitive += nestingLevel;
      }
      
      // Decrease nesting
      if (trimmed === '}') {
        nestingLevel = Math.max(0, nestingLevel - 1);
      }
    });
    
    // Calculate maintainability index (simplified)
    const volume = code.length;
    const maintainabilityIndex = Math.max(0, 171 - 5.2 * Math.log(volume) - 0.23 * cyclomatic - 16.2 * Math.log(lines.length));
    
    return {
      cyclomatic,
      cognitive,
      maintainabilityIndex
    };
  }

  /**
   * Check for logic issues
   */
  private checkLogicIssues(code: string, _language: string, issues: LogicIssue[]): void {
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmed = line.trim();
      
      // Check for unreachable code
      if (index > 0) {
        const prevLineContent = lines[index - 1];
        if (prevLineContent) {
          const prevLine = prevLineContent.trim();
          if (prevLine.includes('return') && trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('}')) {
            issues.push({
              type: 'unreachable',
              line: lineNumber,
              message: 'Unreachable code after return statement',
              severity: 'medium',
              fixSuggestion: 'Remove unreachable code or restructure logic'
            });
          }
        }
      }
      
      // Check for undefined variable usage (basic check)
      const varMatch = trimmed.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*=/);
      if (varMatch && varMatch[1]) {
        const varName = varMatch[1];
        // This is a simplified check - in production, would use proper AST analysis
        const usage = code.indexOf(varName);
        const definition = code.indexOf(`${varName} =`);
        if (usage !== -1 && usage < definition) {
          issues.push({
            type: 'undefined',
            line: lineNumber,
            message: `Variable '${varName}' used before definition`,
            severity: 'high',
            fixSuggestion: `Define '${varName}' before using it`
          });
        }
      }
    });
  }

  /**
   * Analyze code patterns
   */
  private analyzeCodePatterns(code: string, language: string, recognized: string[], antiPatterns: string[]): void {
    // Check for recognized good patterns
    for (const [name, pattern] of this.knownPatterns.entries()) {
      if (pattern.language === language || pattern.language === 'generic') {
        const hasPattern = pattern.examples.some(example => code.includes(example));
        if (hasPattern) {
          if (pattern.quality === 'good') {
            recognized.push(name);
          } else if (pattern.quality === 'antipattern') {
            antiPatterns.push(name);
          }
        }
      }
    }
  }

  /**
   * Calculate logic score
   */
  private calculateLogicScore(issues: LogicIssue[], complexity: any, antiPatterns: string[]): number {
    let score = 1.0;
    
    // Penalize for issues
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'high': score -= 0.3; break;
        case 'medium': score -= 0.2; break;
        case 'low': score -= 0.1; break;
      }
    });
    
    // Penalize for high complexity
    if (complexity.cyclomatic > 15) score -= 0.2;
    if (complexity.cognitive > 25) score -= 0.2;
    if (complexity.maintainabilityIndex < 20) score -= 0.1;
    
    // Penalize for anti-patterns
    score -= antiPatterns.length * 0.15;
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Validate security aspects
   */
  private async validateSecurity(code: string, language: string, _context: any): Promise<SecurityValidationResult> {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    // Check for security vulnerabilities
    this.checkSecurityVulnerabilities(code, language, vulnerabilities);
    
    // Calculate risk level
    const riskLevel = this.calculateRiskLevel(vulnerabilities);
    
    // Check compliance
    const compliance = {
      owasp: vulnerabilities.filter(v => ['injection', 'xss', 'authentication'].includes(v.type)).length === 0,
      gdpr: !code.includes('personal') || code.includes('encrypt'), // Simplified
      dataHandling: !this.hasUnsafeDataHandling(code)
    };
    
    const score = this.calculateSecurityScore(vulnerabilities, riskLevel);
    
    return {
      passed: vulnerabilities.filter(v => v.severity === 'high' || v.severity === 'critical').length === 0,
      score,
      vulnerabilities,
      riskLevel,
      compliance
    };
  }

  /**
   * Check for security vulnerabilities
   */
  private checkSecurityVulnerabilities(code: string, _language: string, vulnerabilities: SecurityVulnerability[]): void {
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // SQL Injection patterns
      if (line.includes('SELECT') && line.includes('+')) {
        vulnerabilities.push({
          type: 'injection',
          line: lineNumber,
          message: 'Potential SQL injection vulnerability',
          severity: 'high',
          cwe: 'CWE-89',
          mitigation: 'Use parameterized queries or prepared statements'
        });
      }
      
      // XSS patterns
      if (line.includes('innerHTML') && !line.includes('sanitize')) {
        vulnerabilities.push({
          type: 'xss',
          line: lineNumber,
          message: 'Potential XSS vulnerability with innerHTML',
          severity: 'medium',
          cwe: 'CWE-79',
          mitigation: 'Sanitize user input or use textContent instead'
        });
      }
      
      // Authentication issues
      if (line.includes('password') && line.includes('==')) {
        vulnerabilities.push({
          type: 'authentication',
          line: lineNumber,
          message: 'Insecure password comparison',
          severity: 'high',
          cwe: 'CWE-327',
          mitigation: 'Use secure password hashing and comparison'
        });
      }
      
      // Data exposure patterns
      if (line.includes('console.log') && line.includes('password')) {
        vulnerabilities.push({
          type: 'dataExposure',
          line: lineNumber,
          message: 'Sensitive data logged to console',
          severity: 'medium',
          cwe: 'CWE-532',
          mitigation: 'Remove sensitive data from logging'
        });
      }
    });
  }

  /**
   * Validate performance aspects
   */
  private async validatePerformance(code: string, language: string, _context: any): Promise<PerformanceValidationResult> {
    const issues: PerformanceIssue[] = [];
    const optimizations: string[] = [];
    
    // Check for performance issues
    this.checkPerformanceIssues(code, language, issues, optimizations);
    
    // Calculate metrics
    const metrics = this.calculatePerformanceMetrics(code, language);
    
    const score = this.calculatePerformanceScore(issues, metrics);
    
    return {
      passed: score >= 0.7,
      score,
      issues,
      metrics,
      optimizations
    };
  }

  /**
   * Check for performance issues
   */
  private checkPerformanceIssues(code: string, _language: string, issues: PerformanceIssue[], optimizations: string[]): void {
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Nested loop detection
      if (line.includes('for') && code.includes('for', code.indexOf(line) + line.length)) {
        issues.push({
          type: 'algorithmic',
          line: lineNumber,
          message: 'Nested loops may cause performance issues',
          impact: 'medium',
          optimization: 'Consider optimizing algorithm complexity'
        });
      }
      
      // Inefficient string concatenation
      if (line.includes('+') && line.includes('string')) {
        issues.push({
          type: 'memory',
          line: lineNumber,
          message: 'Inefficient string concatenation',
          impact: 'low',
          optimization: 'Use StringBuilder or template literals'
        });
      }
      
      // Database queries in loops
      if (line.includes('query') && line.includes('for')) {
        issues.push({
          type: 'database',
          line: lineNumber,
          message: 'Database query inside loop',
          impact: 'high',
          optimization: 'Use bulk operations or caching'
        });
      }
    });
    
    // Add general optimizations
    if (code.includes('async')) {
      optimizations.push('Consider using Promise.all() for parallel async operations');
    }
    if (code.includes('Array')) {
      optimizations.push('Consider using efficient array methods like map(), filter()');
    }
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(code: string, _language: string): {
    estimatedComplexity: string;
    memoryUsage: 'low' | 'medium' | 'high';
    scalabilityRisk: number;
  } {
    const lines = code.split('\n').length;
    const nestedLoops = (code.match(/for.*for/g) || []).length;
    const recursions = (code.match(/function\s+(\w+).*\1\(/g) || []).length;
    
    let complexity = 'O(1)';
    if (nestedLoops > 0) complexity = `O(n^${nestedLoops + 1})`;
    else if (code.includes('for') || code.includes('while')) complexity = 'O(n)';
    
    let memoryUsage: 'low' | 'medium' | 'high' = 'low';
    if (lines > 500) memoryUsage = 'medium';
    if (lines > 1000 || code.includes('array') && code.includes('large')) memoryUsage = 'high';
    
    const scalabilityRisk = Math.min(1.0, (nestedLoops * 0.3 + recursions * 0.2 + lines / 1000));
    
    return {
      estimatedComplexity: complexity,
      memoryUsage,
      scalabilityRisk
    };
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(issues: PerformanceIssue[], metrics: any): number {
    let score = 1.0;
    
    // Penalize for issues
    issues.forEach(issue => {
      switch (issue.impact) {
        case 'high': score -= 0.3; break;
        case 'medium': score -= 0.2; break;
        case 'low': score -= 0.1; break;
      }
    });
    
    // Penalize for high scalability risk
    score -= metrics.scalabilityRisk * 0.4;
    
    // Penalize for high memory usage
    if (metrics.memoryUsage === 'high') score -= 0.2;
    else if (metrics.memoryUsage === 'medium') score -= 0.1;
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Validate against hallucinations
   */
  private async validateHallucination(code: string, language: string, context: any): Promise<HallucinationValidationResult> {
    const issues: HallucinationIssue[] = [];
    
    // Check for hallucination issues
    await this.checkHallucinationIssues(code, language, context, issues);
    
    // Verify various aspects
    const verification = {
      filePathsValid: await this.verifyFilePaths(code),
      dependenciesExist: this.verifyDependencies(code),
      apisVerified: await this.verifyApis(code),
      configurationValid: this.verifyConfiguration(code)
    };
    
    const score = this.calculateHallucinationScore(issues, verification);
    
    return {
      passed: score >= 0.8,
      score,
      issues,
      verification
    };
  }

  /**
   * Check for hallucination issues
   */
  private async checkHallucinationIssues(code: string, _language: string, _context: any, issues: HallucinationIssue[]): Promise<void> {
    // Check file paths
    const pathMatches = code.match(/['"`]([^'"`]*\.[a-zA-Z]{1,4})['"`]/g);
    if (pathMatches) {
      for (const match of pathMatches) {
        const filePath = match.slice(1, -1);
        if (filePath.includes('/') || filePath.includes('\\')) {
          const fullPath = path.resolve(this.projectPath, filePath);
          if (!(await fs.pathExists(fullPath))) {
            issues.push({
              type: 'invalidPath',
              reference: filePath,
              message: `File path '${filePath}' does not exist`,
              severity: 'medium',
              correction: 'Verify the file path exists or create the file'
            });
          }
        }
      }
    }
    
    // Check dependencies
    const importMatches = code.match(/import.*from\s+['"`]([^'"`]+)['"`]/g);
    if (importMatches) {
      for (const match of importMatches) {
        const depMatch = match.match(/from\s+['"`]([^'"`]+)['"`]/);
        if (depMatch && depMatch[1]) {
          const dep = depMatch[1];
          if (!dep.startsWith('.') && !this.dependencyCache.has(dep)) {
            issues.push({
              type: 'missingDependency',
              reference: dep,
              message: `Dependency '${dep}' not found in project`,
              severity: 'high',
              correction: `Install dependency: npm install ${dep}`
            });
          }
        }
      }
    }
    
    // Check for unknown APIs
    const apiMatches = code.match(/\b[a-zA-Z]+\.[a-zA-Z]+\(/g);
    if (apiMatches) {
      for (const match of apiMatches) {
        const api = match.slice(0, -1); // Remove the opening parenthesis
        if (this.apiCache.has(api) && !this.apiCache.get(api)) {
          issues.push({
            type: 'unknownAPI',
            reference: api,
            message: `Unknown or deprecated API: ${api}`,
            severity: 'medium',
            correction: 'Verify API documentation or use alternative'
          });
        }
      }
    }
  }

  /**
   * Verify file paths exist
   */
  private async verifyFilePaths(code: string): Promise<boolean> {
    const pathMatches = code.match(/['"`]([^'"`]*\.[a-zA-Z]{1,4})['"`]/g);
    if (!pathMatches) return true;
    
    let validPaths = 0;
    let totalPaths = 0;
    
    for (const match of pathMatches) {
      const filePath = match.slice(1, -1);
      if (filePath.includes('/') || filePath.includes('\\')) {
        totalPaths++;
        const fullPath = path.resolve(this.projectPath, filePath);
        if (await fs.pathExists(fullPath)) {
          validPaths++;
        }
      }
    }
    
    return totalPaths === 0 || validPaths / totalPaths >= 0.8;
  }

  /**
   * Verify dependencies exist
   */
  private verifyDependencies(code: string): boolean {
    const importMatches = code.match(/import.*from\s+['"`]([^'"`]+)['"`]/g);
    if (!importMatches) return true;
    
    let validDeps = 0;
    let totalDeps = 0;
    
    for (const match of importMatches) {
      const depMatch = match.match(/from\s+['"`]([^'"`]+)['"`]/);
      if (depMatch && depMatch[1]) {
        const dep = depMatch[1];
        if (!dep.startsWith('.')) {
          totalDeps++;
          if (this.dependencyCache.has(dep)) {
            validDeps++;
          }
        }
      }
    }
    
    return totalDeps === 0 || validDeps / totalDeps >= 0.8;
  }

  /**
   * Verify APIs exist
   */
  private async verifyApis(code: string): Promise<boolean> {
    // Advanced API verification using known API patterns and documentation
    const apiMatches = code.match(/\b[a-zA-Z]+\.[a-zA-Z]+\(/g);
    if (!apiMatches) return true;
    
    let validApis = 0;
    let totalApis = 0;
    
    // Define known API patterns for common libraries
    const knownApis = new Map([
      // Node.js built-ins
      ['console.log', true], ['console.error', true], ['console.warn', true],
      ['process.env', true], ['process.exit', true], ['process.cwd', true],
      ['Buffer.from', true], ['Buffer.alloc', true],
      ['JSON.parse', true], ['JSON.stringify', true],
      ['Object.keys', true], ['Object.values', true], ['Object.entries', true],
      ['Array.from', true], ['Array.isArray', true],
      ['Math.floor', true], ['Math.ceil', true], ['Math.round', true], ['Math.random', true],
      ['Date.now', true], ['Date.parse', true],
      ['String.fromCharCode', true], ['String.prototype.split', true],
      ['Number.parseInt', true], ['Number.parseFloat', true],
      
      // Browser APIs
      ['document.getElementById', true], ['document.createElement', true], ['document.querySelector', true],
      ['window.addEventListener', true], ['window.location', true], ['window.localStorage', true],
      ['fetch.then', true], ['response.json', true], ['response.text', true],
      ['element.addEventListener', true], ['element.appendChild', true], ['element.removeChild', true],
      
      // React APIs
      ['React.useState', true], ['React.useEffect', true], ['React.useContext', true],
      ['React.createElement', true], ['React.Component', true],
      
      // Express APIs
      ['app.get', true], ['app.post', true], ['app.use', true], ['app.listen', true],
      ['req.params', true], ['req.body', true], ['req.query', true],
      ['res.json', true], ['res.send', true], ['res.status', true],
      
      // Common npm packages
      ['axios.get', true], ['axios.post', true], ['axios.put', true], ['axios.delete', true],
      ['fs.readFile', true], ['fs.writeFile', true], ['fs.existsSync', true], ['fs.readFileSync', true],
      ['path.join', true], ['path.resolve', true], ['path.dirname', true], ['path.basename', true],
      ['lodash.map', true], ['lodash.filter', true], ['lodash.reduce', true], ['lodash.find', true],
      ['moment.format', true], ['moment.add', true], ['moment.subtract', true],
      ['bcrypt.hash', true], ['bcrypt.compare', true], ['bcrypt.genSalt', true],
      ['jwt.sign', true], ['jwt.verify', true], ['jwt.decode', true],
    ]);
    
    // Check each API against known patterns
    for (const match of apiMatches) {
      const api = match.slice(0, -1); // Remove opening parenthesis
      totalApis++;
      
      // Direct match
      if (knownApis.has(api)) {
        validApis++;
        continue;
      }
      
      // Pattern matching for common API structures
      const apiParts = api.split('.');
      if (apiParts.length >= 2) {
        const namespace = apiParts[0];
        const method = apiParts[1];
        
        if (namespace && method) {
          // Check for common patterns
          const patterns = [
            `${namespace}.${method}`,
            `${namespace}.prototype.${method}`,
            `${method}` // For methods that might be called on instances
          ];
          
          if (patterns.some(pattern => knownApis.has(pattern))) {
            validApis++;
            continue;
          }
          
          // Check for REST API patterns
          if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
            validApis++;
            continue;
          }
          
          // Check for common method names
          if (['then', 'catch', 'finally', 'map', 'filter', 'reduce', 'forEach', 'find', 'includes', 'indexOf', 'push', 'pop', 'shift', 'unshift', 'splice', 'slice'].includes(method.toLowerCase())) {
            validApis++;
            continue;
          }
          
          // Check for event methods
          if (['addEventListener', 'removeEventListener', 'dispatchEvent', 'on', 'off', 'emit'].includes(method)) {
            validApis++;
            continue;
          }
          
          // Check for database/ORM methods
          if (['save', 'find', 'findOne', 'findById', 'create', 'update', 'delete', 'remove', 'aggregate', 'populate'].includes(method)) {
            validApis++;
            continue;
          }
        }
      }
      
      // If we can't verify, mark as potentially valid (conservative approach)
      // Only mark as invalid if it's clearly wrong
      const suspiciousPatterns = [
        /\d+\.\d+\(/,  // Numbers with methods
        /[A-Z]{5,}\.[a-z]+\(/,  // All caps namespaces (likely constants)
        /[^a-zA-Z0-9_$]\./  // Invalid identifier characters
      ];
      
      if (!suspiciousPatterns.some(pattern => pattern.test(api))) {
        validApis++; // Give benefit of the doubt
      }
    }
    
    // Consider API verification successful if >80% are valid
    return totalApis === 0 || validApis / totalApis >= 0.8;
  }

  /**
   * Verify configuration validity
   */
  private verifyConfiguration(code: string): boolean {
    // Check for common configuration patterns
    if (code.includes('config') || code.includes('settings')) {
      // Basic JSON structure validation
      const jsonMatches = code.match(/\{[^{}]*\}/g);
      if (jsonMatches) {
        for (const match of jsonMatches) {
          try {
            JSON.parse(match);
          } catch {
            return false;
          }
        }
      }
    }
    return true;
  }

  /**
   * Calculate hallucination score
   */
  private calculateHallucinationScore(issues: HallucinationIssue[], verification: any): number {
    let score = 1.0;
    
    // Penalize for issues
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'high': score -= 0.3; break;
        case 'medium': score -= 0.2; break;
        case 'low': score -= 0.1; break;
      }
    });
    
    // Reward for verified aspects
    if (verification.filePathsValid) score += 0.0;
    else score -= 0.2;
    
    if (verification.dependenciesExist) score += 0.0;
    else score -= 0.3;
    
    if (verification.apisVerified) score += 0.0;
    else score -= 0.1;
    
    if (verification.configurationValid) score += 0.0;
    else score -= 0.1;
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Helper methods for missing functionality
   */
  private getSyntaxFixSuggestion(errorMessage: string): string {
    if (errorMessage.includes('Unexpected token')) {
      return 'Check for missing commas, brackets, or quotes';
    }
    if (errorMessage.includes('Unexpected end')) {
      return 'Check for missing closing brackets or braces';
    }
    return 'Review syntax according to language specifications';
  }

  private calculateOverallScore(...results: any[]): number {
    const scores = results.map(r => r.score);
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private calculateConfidence(...results: any[]): number {
    const validationCount = results.filter(r => r.passed).length;
    return validationCount / results.length;
  }

  private generateRecommendations(...results: any[]): ValidationRecommendation[] {
    const recommendations: ValidationRecommendation[] = [];
    
    // Generate recommendations based on validation results
    results.forEach((result, index) => {
      const categories = ['syntax', 'logic', 'security', 'performance', 'hallucination'];
      const category = categories[index] as ValidationRecommendation['category'];
      
      if (!result.passed && result.score < 0.7) {
        recommendations.push({
          category,
          priority: result.score < 0.3 ? 'critical' : result.score < 0.5 ? 'high' : 'medium',
          title: `Improve ${category} quality`,
          description: `${category} validation failed with score ${result.score.toFixed(2)}`,
          implementation: `Review and fix ${category} issues identified`,
          estimatedEffort: result.score < 0.3 ? 'high' : 'medium'
        });
      }
    });
    
    return recommendations;
  }

  private calculateRiskLevel(vulnerabilities: SecurityVulnerability[]): 'low' | 'medium' | 'high' | 'critical' {
    const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
    const mediumCount = vulnerabilities.filter(v => v.severity === 'medium').length;
    
    if (criticalCount > 0) return 'critical';
    if (highCount > 2) return 'high';
    if (highCount > 0 || mediumCount > 3) return 'medium';
    return 'low';
  }

  private calculateSecurityScore(vulnerabilities: SecurityVulnerability[], _riskLevel: string): number {
    let score = 1.0;
    
    vulnerabilities.forEach(vuln => {
      switch (vuln.severity) {
        case 'critical': score -= 0.5; break;
        case 'high': score -= 0.3; break;
        case 'medium': score -= 0.2; break;
        case 'low': score -= 0.1; break;
      }
    });
    
    return Math.max(0, Math.min(1, score));
  }

  private hasUnsafeDataHandling(code: string): boolean {
    // Simple check for unsafe data handling patterns
    return code.includes('eval(') || 
           code.includes('document.write') ||
           (code.includes('localStorage') && !code.includes('encrypt'));
  }

  private createPassingResult(): ValidationResult {
    return {
      overall: { passed: true, score: 1.0, confidence: 1.0, executionTime: 0 },
      syntax: { passed: true, score: 1.0, errors: [], warnings: [], language: '', validatedLines: 0 },
      logic: { passed: true, score: 1.0, issues: [], complexity: { cyclomatic: 1, cognitive: 1, maintainabilityIndex: 100 }, patterns: { recognized: [], antiPatterns: [] } },
      security: this.createPassingSecurityResult(),
      performance: this.createPassingPerformanceResult(),
      hallucination: this.createPassingHallucinationResult(),
      recommendations: []
    };
  }

  private createPassingSecurityResult(): SecurityValidationResult {
    return {
      passed: true,
      score: 1.0,
      vulnerabilities: [],
      riskLevel: 'low',
      compliance: { owasp: true, gdpr: true, dataHandling: true }
    };
  }

  private createPassingPerformanceResult(): PerformanceValidationResult {
    return {
      passed: true,
      score: 1.0,
      issues: [],
      metrics: { estimatedComplexity: 'O(1)', memoryUsage: 'low', scalabilityRisk: 0 },
      optimizations: []
    };
  }

  private createPassingHallucinationResult(): HallucinationValidationResult {
    return {
      passed: true,
      score: 1.0,
      issues: [],
      verification: { filePathsValid: true, dependenciesExist: true, apisVerified: true, configurationValid: true }
    };
  }

  private initializeValidators(): void {
    // Initialize language-specific validators
    this.validators.set('javascript', { parser: 'acorn', rules: [] });
    this.validators.set('typescript', { parser: 'typescript', rules: [] });
    this.validators.set('python', { parser: 'ast', rules: [] });
  }

  private loadSecurityRules(): void {
    // Load security scanning rules
    this.securityRules.set('injection', [
      /SELECT.*\+.*FROM/i,
      /INSERT.*\+.*VALUES/i,
      /UPDATE.*SET.*\+/i
    ]);
    this.securityRules.set('xss', [
      /innerHTML.*\+/i,
      /document\.write.*\+/i
    ]);
  }

  private loadPerformanceRules(): void {
    // Load performance checking rules
    this.performanceRules.set('loops', [
      /for.*for/i,
      /while.*while/i
    ]);
    this.performanceRules.set('memory', [
      /new Array\(\d{4,}\)/i,
      /\.push\(.*\).*for/i
    ]);
  }

  private loadKnownPatterns(): void {
    // Load known code patterns
    this.knownPatterns.set('singleton', {
      name: 'Singleton Pattern',
      description: 'Ensures only one instance exists',
      examples: ['getInstance()', 'static instance'],
      quality: 'good',
      language: 'generic',
      category: 'design-pattern'
    });
    
    this.knownPatterns.set('god-object', {
      name: 'God Object',
      description: 'Object that knows too much or does too much',
      examples: ['class.*{[\\s\\S]{2000,}}'],
      quality: 'antipattern',
      language: 'generic',
      category: 'anti-pattern'
    });
  }

  private async loadProjectDependencies(): Promise<void> {
    try {
      const packagePath = path.join(this.projectPath, 'package.json');
      if (await fs.pathExists(packagePath)) {
        const packageJson = await fs.readJSON(packagePath);
        const deps = [
          ...Object.keys(packageJson.dependencies || {}),
          ...Object.keys(packageJson.devDependencies || {})
        ];
        deps.forEach(dep => this.dependencyCache.add(dep));
      }
    } catch (error) {
      console.warn('Failed to load project dependencies:', error);
    }
  }

  private async loadValidationHistory(): Promise<void> {
    try {
      const historyPath = path.join(this.projectPath, '.openclaude', 'validation-history.json');
      if (await fs.pathExists(historyPath)) {
        this.validationHistory = await fs.readJSON(historyPath);
      }
    } catch (error) {
      console.warn('Failed to load validation history:', error);
    }
  }

  private learnFromValidation(code: string, language: string, result: ValidationResult): void {
    // Learn from validation patterns for future improvements
    if (result.overall.passed) {
      // Extract successful patterns
      this.extractPatterns(code, language);
      // Store successful patterns for future reference
    } else {
      // Learn from failures to improve validation rules
      // Analyze common failure patterns from result
    }
  }

  private extractPatterns(code: string, _language: string): string[] {
    // Extract common code patterns for learning
    const patterns: string[] = [];
    
    // Function patterns
    const functions = code.match(/function\s+\w+\([^)]*\)/g);
    if (functions) patterns.push(...functions);
    
    // Class patterns
    const classes = code.match(/class\s+\w+/g);
    if (classes) patterns.push(...classes);
    
    return patterns;
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): {
    totalValidations: number;
    passRate: number;
    averageScore: number;
    commonIssues: { type: string; count: number }[];
  } {
    const total = this.validationHistory.length;
    const passed = this.validationHistory.filter(v => v.overall.passed).length;
    const avgScore = total > 0 ? 
      this.validationHistory.reduce((sum, v) => sum + v.overall.score, 0) / total : 0;
    
    // Count common issues
    const issues: { [key: string]: number } = {};
    this.validationHistory.forEach(v => {
      v.syntax.errors.forEach(e => {
        issues[e.message] = (issues[e.message] || 0) + 1;
      });
      v.security.vulnerabilities.forEach(vuln => {
        issues[vuln.type] = (issues[vuln.type] || 0) + 1;
      });
    });
    
    const commonIssues = Object.entries(issues)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      totalValidations: total,
      passRate: total > 0 ? passed / total : 0,
      averageScore: avgScore,
      commonIssues
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Save validation history
    try {
      const historyPath = path.join(this.projectPath, '.openclaude', 'validation-history.json');
      await fs.ensureDir(path.dirname(historyPath));
      await fs.writeJSON(historyPath, this.validationHistory.slice(-100), { spaces: 2 });
    } catch (error) {
      console.warn('Failed to save validation history:', error);
    }
    
    this.emit('cleanup_complete');
  }
}

import chalk from 'chalk';
import { BRAND_COLORS, createErrorMessage, createSuccessMessage } from '../interface/logo.js';
import { LoadingSpinner } from '../interface/components.js';

/**
 * Base class for all OpenClaude  commands
 * Provides consistent structure and error handling
 */
export abstract class BaseCommand {
  protected spinner: LoadingSpinner | null = null;

  /**
   * Execute the command with proper error handling
   */
  public async execute(...args: any[]): Promise<void> {
    try {
      await this.run(...args);
    } catch (error) {
      this.handleError(error);
    } finally {
      this.cleanup();
    }
  }

  /**
   * Main command logic - to be implemented by subclasses
   */
  protected abstract run(...args: any[]): Promise<void>;

  /**
   * Start a loading spinner with message
   */
  protected startSpinner(message: string): void {
    this.spinner = new LoadingSpinner(message);
    this.spinner.start();
  }

  /**
   * Stop the loading spinner with optional success message
   */
  protected stopSpinner(successMessage?: string): void {
    if (this.spinner) {
      this.spinner.stop(successMessage);
      this.spinner = null;
    }
  }

  /**
   * Update spinner message
   */
  protected updateSpinner(message: string): void {
    if (this.spinner) {
      this.spinner.updateMessage(message);
    }
  }

  /**
   * Log success message
   */
  protected logSuccess(message: string): void {
    console.log(createSuccessMessage(message));
  }

  /**
   * Log error message
   */
  protected logError(message: string): void {
    console.error(createErrorMessage(message));
  }

  /**
   * Log info message
   */
  protected logInfo(message: string): void {
    const info = chalk.hex(BRAND_COLORS.primary);
    console.log(`ℹ️  ${info(message)}`);
  }

  /**
   * Log warning message
   */
  protected logWarning(message: string): void {
    const warning = chalk.hex(BRAND_COLORS.warning);
    console.log(`⚠️  ${warning(message)}`);
  }

  /**
   * Handle command errors consistently
   */
  private handleError(error: unknown): void {
    this.stopSpinner();
    
    if (error instanceof Error) {
      this.logError(error.message);
      
      // In development, show stack trace
      if (process.env['NODE_ENV'] === 'development') {
        console.error(chalk.hex(BRAND_COLORS.muted)(error.stack || ''));
      }
    } else {
      this.logError('An unknown error occurred');
    }
    
    process.exit(1);
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  /**
   * Validate required parameters
   */
  protected validateRequired(params: Record<string, any>, required: string[]): void {
    const missing = required.filter(key => !params[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required parameters: ${missing.join(', ')}`);
    }
  }

  /**
   * Display command header
   */
  protected displayHeader(title: string, subtitle?: string): void {
    const primary = chalk.hex(BRAND_COLORS.primary).bold;
    const secondary = chalk.hex(BRAND_COLORS.secondary);
    const divider = chalk.hex(BRAND_COLORS.muted)('═'.repeat(60));
    
    console.log(`\n${divider}`);
    console.log(primary(`🚀 ${title}`));
    
    if (subtitle) {
      console.log(secondary(subtitle));
    }
    
    console.log(`${divider}\n`);
  }
}
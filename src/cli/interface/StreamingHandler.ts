/**
 * Copyright (c) 2025 OpenAgent Team
 * Licensed under the MIT License
 */

import chalk from "chalk";

/**
 * Professional streaming handler with spinner and status updates
 */
export class StreamingHandler {
  private frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  private interval: NodeJS.Timeout | null = null;
  private frameIndex = 0;
  private currentStatus = "";
  private isActive = false;
  private isStopped = false;
  private startTime = Date.now();

  /**
   * Start the streaming handler with initial status
   */
  start(status: string = "Processing"): void {
    if (this.isActive) return;

    this.currentStatus = status;
    this.isActive = true;
    this.isStopped = false; // Reset stopped flag for new session
    this.startTime = Date.now();

    this.interval = setInterval(() => {
      if (this.isActive && this.interval && !this.isStopped) {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const timeStr = elapsed > 0 ? chalk.dim(` (${elapsed}s)`) : "";
        process.stdout.write(
          `\r${chalk.cyan(this.frames[this.frameIndex])} ${chalk.dim(
            this.currentStatus
          )}${timeStr}...`
        );
        this.frameIndex = (this.frameIndex + 1) % this.frames.length;
      }
    }, 80);
  }

  /**
   * Update the status message
   */
  updateStatus(status: string): void {
    this.currentStatus = status;
  }

  /**
   * Show a brief status update without changing the main status
   */
  showUpdate(
    message: string,
    type: "info" | "success" | "warning" = "info"
  ): void {
    if (!this.isActive) return;

    this.clearLine();

    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
    };

    console.log(colors[type](`→ ${message}`));
    // Don't restart the spinner, it will continue on next interval
  }

  /**
   * Stop the streaming handler and clear the line
   */
  stop(): void {
    this.isStopped = true; // Immediately prevent any new writes
    this.isActive = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.clearLine();
    // Ensure line is fully cleared after interval stops
    setTimeout(() => {
      if (this.isStopped) {
        // Only clear if still stopped
        this.clearLine();
      }
    }, 100);
  }

  /**
   * Show final completion message
   */
  complete(message: string = "Complete"): void {
    this.stop();
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const timeStr = elapsed > 0 ? chalk.dim(` (${elapsed}s)`) : "";
    console.log(chalk.green(`✓ ${message}${timeStr}`));
  }

  /**
   * Show error message and stop
   */
  error(message: string): void {
    this.stop();
    console.log(chalk.red(`✗ ${message}`));
  }

  /**
   * Clear the current line
   */
  private clearLine(): void {
    process.stdout.write("\r\x1B[K"); // Move to start of line and clear to end
  }

  /**
   * Check if handler is currently active
   */
  isRunning(): boolean {
    return this.isActive;
  }
}

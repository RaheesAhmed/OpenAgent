import chalk from "chalk";
import { BRAND_COLORS, STATUS_ICONS } from "./logo.js";

export class StreamingHandler {
  private frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  
  private interval: NodeJS.Timeout | null = null;
  private frameIndex = 0;
  private currentStatus = "";
  private isActive = false;
  private isStopped = false;
  private startTime = Date.now();
  private useGradient = false;

  start(status: string = "Processing", useGradient: boolean = false): void {
    if (this.isActive) return;

    this.currentStatus = status;
    this.isActive = true;
    this.isStopped = false;
    this.startTime = Date.now();
    this.useGradient = useGradient;

    this.interval = setInterval(() => {
      if (this.isActive && this.interval && !this.isStopped) {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        let timeStr = "";
        if (elapsed > 0) {
          if (minutes > 0) {
            timeStr = chalk.hex(BRAND_COLORS.muted)(` [${minutes}:${seconds.toString().padStart(2, '0')}]`);
          } else {
            timeStr = chalk.hex(BRAND_COLORS.muted)(` [${seconds}s]`);
          }
        }

        const frames = this.useGradient ? this.frames : this.frames;
        const spinner = chalk.hex(BRAND_COLORS.primary)(frames[this.frameIndex]);
        const statusText = chalk.hex(BRAND_COLORS.text)(this.currentStatus);
        
        process.stdout.write(`\r${spinner} ${statusText}${timeStr}`);
        this.frameIndex = (this.frameIndex + 1) % frames.length;
      }
    }, this.useGradient ? 120 : 80);
  }

  updateStatus(status: string): void {
    this.currentStatus = status;
  }

  showUpdate(message: string, type: "info" | "success" | "warning" = "info"): void {
    if (!this.isActive) return;

    this.clearLine();

    const icons = {
      info: STATUS_ICONS.info,
      success: STATUS_ICONS.success,
      warning: STATUS_ICONS.warning,
    };

    const colors = {
      info: BRAND_COLORS.primary,
      success: BRAND_COLORS.success,
      warning: BRAND_COLORS.warning,
    };

    console.log(chalk.hex(colors[type])(`${icons[type]} ${message}`));
  }

  showProgress(message: string): void {
    if (!this.isActive) return;
    
    this.clearLine();
    console.log(chalk.hex(BRAND_COLORS.accent)(`${STATUS_ICONS.gear} ${message}`));
  }

  stop(): void {
    this.isStopped = true;
    this.isActive = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    // Don't clear line when stopped by agent - let agent content write over spinner
    // Only clear if we're being stopped manually (not by agent streaming)
  }
  
  // New method for manual stopping (non-agent) - ensures clean line break
  stopAndClear(): void {
    this.stop();
    this.clearLine();
    process.stdout.write('\n'); // Add newline so agent content starts on fresh line
  }

  complete(message: string = "Complete"): void {
    this.stop();
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    let timeStr = "";
    if (elapsed > 0) {
      if (minutes > 0) {
        timeStr = chalk.hex(BRAND_COLORS.muted)(` [${minutes}:${seconds.toString().padStart(2, '0')}]`);
      } else {
        timeStr = chalk.hex(BRAND_COLORS.muted)(` [${seconds}s]`);
      }
    }

    console.log(chalk.hex(BRAND_COLORS.success)(`${STATUS_ICONS.success} ${message}${timeStr}`));
  }

  error(message: string): void {
    this.stop();
    console.log(chalk.hex(BRAND_COLORS.error)(`${STATUS_ICONS.error} ${message}`));
  }

  private clearLine(): void {
    process.stdout.write("\r\x1B[K");
  }

  isRunning(): boolean {
    return this.isActive;
  }
}

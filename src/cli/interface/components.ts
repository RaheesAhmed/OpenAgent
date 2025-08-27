import chalk from 'chalk';
import inquirer from 'inquirer';
import { BRAND_COLORS, STATUS_ICONS, SPINNER_CHARS } from './logo.js';

/**
 * Modern CLI Interface Components
 */

/**
 * Loading spinner with customizable message
 */
export class LoadingSpinner {
  private interval: NodeJS.Timeout | null = null;
  private spinnerIndex = 0;
  private message: string;

  constructor(message: string = 'Loading...') {
    this.message = message;
  }

  start(): void {
    process.stdout.write('\x1B[?25l'); // Hide cursor
    
    this.interval = setInterval(() => {
      const spinner = chalk.hex(BRAND_COLORS.primary)(SPINNER_CHARS[this.spinnerIndex]);
      const text = chalk.hex(BRAND_COLORS.text)(this.message);
      
      process.stdout.write(`\r${spinner} ${text}`);
      this.spinnerIndex = (this.spinnerIndex + 1) % SPINNER_CHARS.length;
    }, 100);
  }

  stop(finalMessage?: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    process.stdout.write('\r\x1B[K'); // Clear line
    process.stdout.write('\x1B[?25h'); // Show cursor
    
    if (finalMessage) {
      console.log(finalMessage);
    }
  }

  updateMessage(message: string): void {
    this.message = message;
  }
}

/**
 * Progress bar for long-running tasks
 */
export class ProgressBar {
  private total: number;
  // private current: number = 0;
  private barLength: number = 40;
  
  constructor(total: number) {
    this.total = total;
  }

  update(current: number, message?: string): void {
    const percentage = Math.round((current / this.total) * 100);
    const filled = Math.round((current / this.total) * this.barLength);
    
    const bar = '█'.repeat(filled) + '░'.repeat(this.barLength - filled);
    const coloredBar = chalk.hex(BRAND_COLORS.primary)(bar);
    const percentText = chalk.hex(BRAND_COLORS.accent).bold(`${percentage}%`);
    const messageText = message ? chalk.hex(BRAND_COLORS.text)(` - ${message}`) : '';
    
    process.stdout.write(`\r[${coloredBar}] ${percentText}${messageText}`);
    
    if (current >= this.total) {
      console.log(); // New line when complete
    }
  }
}

/**
 * Styled section headers
 */
export function createSectionHeader(title: string, subtitle?: string): string {
  const primary = chalk.hex(BRAND_COLORS.primary).bold;
  const secondary = chalk.hex(BRAND_COLORS.secondary);
  const divider = chalk.hex(BRAND_COLORS.muted)('═'.repeat(50));
  
  let header = `\n${divider}\n${primary(`📋 ${title}`)}\n`;
  
  if (subtitle) {
    header += `${secondary(subtitle)}\n`;
  }
  
  header += `${divider}\n`;
  
  return header;
}

/**
 * Styled list item
 */
export function createListItem(text: string, status: 'pending' | 'success' | 'error' | 'info' = 'info'): string {
  const statusIcons = {
    pending: chalk.hex(BRAND_COLORS.warning)('○'),
    success: chalk.hex(BRAND_COLORS.success)('●'),
    error: chalk.hex(BRAND_COLORS.error)('●'),
    info: chalk.hex(BRAND_COLORS.primary)('●')
  };
  
  const textColor = chalk.hex(BRAND_COLORS.text);
  return `  ${statusIcons[status]} ${textColor(text)}`;
}

/**
 * Styled command prompt
 */
export async function styledPrompt<T = string>(config: {
  type: 'input' | 'password' | 'confirm' | 'list' | 'checkbox';
  name: string;
  message: string;
  choices?: string[] | Array<{ name: string; value: any }>;
  default?: any;
  validate?: (input: any) => boolean | string;
}): Promise<T> {
  const styledMessage = chalk.hex(BRAND_COLORS.primary)(`${STATUS_ICONS.robot} ${config.message}`);
  
  const prompt = {
    ...config,
    message: styledMessage,
    prefix: '',
    suffix: ''
  };

  const answers = await inquirer.prompt([prompt]);
  return answers[config.name];
}

/**
 * Create a beautiful table
 */
export function createTable(headers: string[], rows: string[][]): string {
  const primary = chalk.hex(BRAND_COLORS.primary).bold;
  // const secondary = chalk.hex(BRAND_COLORS.secondary);
  const text = chalk.hex(BRAND_COLORS.text);
  
  // Calculate column widths
  const colWidths = headers.map((header, i) => {
    const maxRowWidth = Math.max(...rows.map(row => (row[i] || '').length));
    return Math.max(header.length, maxRowWidth) + 2;
  });
  
  // Create header
  let table = '\n';
  table += '┌' + colWidths.map(w => '─'.repeat(w)).join('┬') + '┐\n';
  table += '│' + headers.map((h, i) => primary(h.padEnd(colWidths[i] || 0))).join('│') + '│\n';
  table += '├' + colWidths.map(w => '─'.repeat(w)).join('┼') + '┤\n';
  
  // Add rows
  rows.forEach(row => {
    table += '│' + row.map((cell, i) => text((cell || '').padEnd(colWidths[i] || 0))).join('│') + '│\n';
  });
  
  table += '└' + colWidths.map(w => '─'.repeat(w)).join('┴') + '┘\n';
  
  return table;
}

/**
 * Animated typing effect for messages
 */
export async function typeMessage(message: string, speed: number = 50): Promise<void> {
  for (const char of message) {
    process.stdout.write(char);
    await new Promise(resolve => setTimeout(resolve, speed));
  }
  console.log(); // New line
}

/**
 * Confirmation dialog with modern styling
 */
export async function confirmAction(message: string, defaultValue: boolean = false): Promise<boolean> {
  const styledMessage = chalk.hex(BRAND_COLORS.warning)(`⚠️  ${message}`);
  
  return await styledPrompt<boolean>({
    type: 'confirm',
    name: 'confirm',
    message: styledMessage,
    default: defaultValue
  });
}

/**
 * Multi-select menu with modern styling
 */
export async function multiSelectMenu(
  message: string,
  choices: Array<{ name: string; value: any; checked?: boolean }>
): Promise<any[]> {
  const styledMessage = chalk.hex(BRAND_COLORS.primary)(`📋 ${message}`);
  
  return await styledPrompt<any[]>({
    type: 'checkbox',
    name: 'selected',
    message: styledMessage,
    choices: choices.map(choice => ({
      ...choice,
      name: chalk.hex(BRAND_COLORS.text)(choice.name)
    }))
  });
}

/**
 * Single select menu with modern styling
 */
export async function singleSelectMenu(
  message: string,
  choices: Array<{ name: string; value: any }>
): Promise<any> {
  const styledMessage = chalk.hex(BRAND_COLORS.primary)(`🎯 ${message}`);
  
  return await styledPrompt<any>({
    type: 'list',
    name: 'selected',
    message: styledMessage,
    choices: choices.map(choice => ({
      ...choice,
      name: chalk.hex(BRAND_COLORS.text)(choice.name)
    }))
  });
}

/**
 * Display a beautiful info box
 */
export function displayInfoBox(title: string, content: string[], type: 'info' | 'warning' | 'success' | 'error' = 'info'): void {
  const colors = {
    info: BRAND_COLORS.primary,
    warning: BRAND_COLORS.warning,
    success: BRAND_COLORS.success,
    error: BRAND_COLORS.error
  };
  
  const icons = {
    info: STATUS_ICONS.info,
    warning: STATUS_ICONS.warning,
    success: STATUS_ICONS.success,
    error: STATUS_ICONS.error
  };
  
  const color = chalk.hex(colors[type]);
  const text = chalk.hex(BRAND_COLORS.text);
  
  console.log('\n' + color('┌─' + '─'.repeat(50) + '─┐'));
  console.log(color('│ ') + color.bold(`${icons[type]} ${title}`) + ' '.repeat(50 - title.length - 3) + color('│'));
  console.log(color('├─' + '─'.repeat(50) + '─┤'));
  
  content.forEach(line => {
    const paddedLine = line.padEnd(48);
    console.log(color('│ ') + text(paddedLine) + color(' │'));
  });
  
  console.log(color('└─' + '─'.repeat(50) + '─┘\n'));
}

/**
 * Clear screen and prepare for fresh interface
 */
export function clearScreen(): void {
  console.clear();
}

/**
 * Create a beautiful divider
 */
export function createDivider(char: string = '─', color: string = BRAND_COLORS.muted): string {
  return chalk.hex(color)(char.repeat(60));
}
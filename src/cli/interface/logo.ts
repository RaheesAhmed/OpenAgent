

/**
 * Copyright (c) 2025 OpenAgent Team
 * Licensed under the MIT License
 *
 * OpenAgent ASCII Logo - Modern and Clean Design
 */
import chalk from "chalk";
export const OPENAGENT_LOGO =`
 ██████╗ ██████╗ ███████╗███╗   ██╗     █████╗  ██████╗ ███████╗███╗   ██╗████████╗
██╔═══██╗██╔══██╗██╔════╝████╗  ██║    ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝
██║   ██║██████╔╝█████╗  ██╔██╗ ██║    ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║
██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║    ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║
╚██████╔╝██║     ███████╗██║ ╚████║    ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║
 ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝    ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝
`;

/**
 * Compact logo for smaller displays
 */
export const COMPACT_LOGO = `
 ██████╗  █████╗
██╔═══██╗██╔══██╗
██║   ██║███████║
██║   ██║██╔══██║
╚██████╔╝██║  ██║
 ╚═════╝ ╚═╝  ╚═╝
`;

export const BRAND_COLORS = {
  primary: '#FF6B35',     // Vibrant orange-red - main brand color
  secondary: '#F7931E',   // Golden orange - secondary accent
  accent: '#FFD700',      // Pure gold - highlights and success
  success: '#32CD32',     // Lime green - success states
  warning: '#FFA500',     // Orange - warnings
  error: '#FF4757',       // Coral red - errors
  muted: '#95A5A6',       // Light gray - muted text
  text: '#FFFFFF',        // Pure white - text
  background: '#1A1A1A',  // Rich dark background
  gradient: ['#FF6B35', '#F7931E', '#FFD700'], // Fire gradient
  glow: '#FFD700'         // Gold glow effect
} as const;

export const SPINNER_CHARS = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export const STATUS_ICONS = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  rocket: '🚀',
  gear: '⚙️',
  lightning: '⚡',
  brain: '🧠',
  sparkles: '✨',
  robot: '🤖'
} as const;

export function displayLogo(): void {
  const gradient = chalk.hex(BRAND_COLORS.primary).bold;
  const secondary = chalk.hex(BRAND_COLORS.secondary);
  const accent = chalk.hex(BRAND_COLORS.accent);
  
  console.log(gradient(OPENAGENT_LOGO));
  console.log(chalk.hex(BRAND_COLORS.muted)('  ') + secondary('Your AI Development Companion'));
  console.log(chalk.hex(BRAND_COLORS.muted)('  ') + accent('v1.0.0') + chalk.hex(BRAND_COLORS.muted)(' • Open Source • Advanced AI'));
}

export function displayCompactLogo(): void {
  const gradient = chalk.hex(BRAND_COLORS.primary).bold;
  const secondary = chalk.hex(BRAND_COLORS.secondary);
  console.log(gradient(COMPACT_LOGO));
  console.log(secondary('  OpenAgent'));
}

export const TAGLINES = {
  main: STATUS_ICONS.rocket + ' The World\'s Most Advanced Open-Source AI Development Assistant',
  short: STATUS_ICONS.sparkles + ' AI-Powered Development Excellence',
  technical: STATUS_ICONS.brain + ' Advanced AI • Perfect Memory • Zero Assumptions',
  enterprise: STATUS_ICONS.gear + ' Enterprise-Grade AI Development Platform',
  welcome: STATUS_ICONS.sparkles + ' Welcome to the future of AI-assisted development'
} as const;

export function displayVersion(version: string): void {
  const versionColor = chalk.hex(BRAND_COLORS.accent).bold;
  const labelColor = chalk.hex(BRAND_COLORS.muted);
  
  console.log(`${labelColor('Version:')} ${versionColor(version)}`);
  console.log(`${labelColor('Build:')} ${chalk.hex(BRAND_COLORS.secondary)(new Date().toISOString().split('T')[0])}`);
}

export function displayStartupBanner(): void {
  const primary = chalk.hex(BRAND_COLORS.primary);
  const accent = chalk.hex(BRAND_COLORS.accent);
  const muted = chalk.hex(BRAND_COLORS.muted);
  
  console.log(primary('━'.repeat(80)));
  console.log(accent.bold('  OpenAgent is initializing your development environment...'));
  console.log(muted('  Please wait while we prepare everything for you.'));
  console.log(primary('━'.repeat(80)));
}

export function displayReadyBanner(): void {
  const success = chalk.hex(BRAND_COLORS.success);
  const muted = chalk.hex(BRAND_COLORS.muted);
  
  console.log('\n' + success('━'.repeat(80)));
  console.log(success.bold(`  ${STATUS_ICONS.success} OpenAgent is ready and at your service!`));
  console.log(muted('  Start by asking a question or typing /help for available commands.'));
  console.log(success('━'.repeat(80)));
}

export function createWelcomeMessage(): string {
  const primary = chalk.hex(BRAND_COLORS.primary).bold;
  const muted = chalk.hex(BRAND_COLORS.muted);
  
  return `
${primary('Ready to code.')}

${muted('Just run "openagent" to start.')}
`;
}

/**
 * Create error message with consistent styling
 */
export function createErrorMessage(message: string): string {
  const error = chalk.hex(BRAND_COLORS.error).bold;
  const muted = chalk.hex(BRAND_COLORS.muted);
  
  return `${STATUS_ICONS.error} ${error('Error:')} ${muted(message)}`;
}

/**
 * Create success message with consistent styling
 */
export function createSuccessMessage(message: string): string {
  const success = chalk.hex(BRAND_COLORS.success).bold;
  const text = chalk.hex(BRAND_COLORS.text);
  
  return `${STATUS_ICONS.success} ${success('Success:')} ${text(message)}`;
}

/**
 * Create info message with consistent styling
 */
export function createInfoMessage(message: string): string {
  const info = chalk.hex(BRAND_COLORS.primary).bold;
  const text = chalk.hex(BRAND_COLORS.text);
  
  return `${STATUS_ICONS.info} ${info('Info:')} ${text(message)}`;
}

/**
 * Create warning message with consistent styling
 */
export function createWarningMessage(message: string): string {
  const warning = chalk.hex(BRAND_COLORS.warning).bold;
  const text = chalk.hex(BRAND_COLORS.text);
  
  return `${STATUS_ICONS.warning} ${warning('Warning:')} ${text(message)}`;
}

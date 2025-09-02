

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

/**
 * Brand colors and styling - Premium Gold & Fire Palette
 */
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

/**
 * Display the main OpenAgent logo with gradient effect
 */
export function displayLogo(): void {
  const gradient = chalk.hex(BRAND_COLORS.primary).bold;
  const secondary = chalk.hex(BRAND_COLORS.secondary);
  
  console.log(gradient(OPENAGENT_LOGO));
  console.log(secondary('Your Coding Companion'));
}

/**
 * Display compact logo for smaller contexts
 */
export function displayCompactLogo(): void {
  const gradient = chalk.hex(BRAND_COLORS.primary).bold;
  console.log(gradient(COMPACT_LOGO));
}

/**
 * Brand tagline variations
 */
export const TAGLINES = {
  main: '🚀 The World\'s Most Advanced Open-Source AI Development Assistant',
  short: '✨ AI-Powered Development Excellence',
  technical: '🔬 Advanced AI • Perfect Memory • Zero Assumptions',
  enterprise: '🏢 Enterprise-Grade AI Development Platform'
} as const;

/**
 * Version and build info display
 */
export function displayVersion(version: string): void {
  const versionColor = chalk.hex(BRAND_COLORS.accent).bold;
  const labelColor = chalk.hex(BRAND_COLORS.muted);
  
  console.log(`${labelColor('Version:')} ${versionColor(version)}`);
}

/**
 * Loading spinner characters for animations
 */
export const SPINNER_CHARS = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * Status icons
 */
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

/**
 * Create a beautiful welcome message
 */
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
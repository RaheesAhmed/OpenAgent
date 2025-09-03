/**
 * Copyright (c) 2025 OpenAgent Team
 * Licensed under the MIT License
 *
 * Token counting and pricing utility for OpenAgent
 */
export class TokenCounter {
  // Pricing per million tokens (input/output) - Updated 2025 Pricing
  private static readonly PRICING = {
    // Anthropic Claude Models
    'claude-3-5-sonnet-20241022': {
      input: 3.00,
      output: 15.00
    },
    'claude-3-5-sonnet-20240620': {
      input: 3.00,
      output: 15.00
    },
    'claude-3-5-haiku-20241022': {
      input: 0.25,
      output: 1.25
    },
    'claude-3-opus-20240229': {
      input: 15.00,
      output: 75.00
    },
    'claude-3-sonnet-20240229': {
      input: 3.00,
      output: 15.00
    },
    'claude-3-haiku-20240307': {
      input: 0.25,
      output: 1.25
    },
    'claude-sonnet-4-20250514': {
      input: 3.00,
      output: 15.00
    },
    'claude-opus-4-20250514': {
      input: 15.00,
      output: 75.00
    },

    // OpenAI Models
    'gpt-4o': {
      input: 2.50,
      output: 10.00
    },
    'gpt-4o-2024-11-20': {
      input: 2.50,
      output: 10.00
    },
    'gpt-4o-mini': {
      input: 0.15,
      output: 0.60
    },
    'gpt-4o-mini-2024-07-18': {
      input: 0.15,
      output: 0.60
    },
    'gpt-4-turbo': {
      input: 10.00,
      output: 30.00
    },
    'gpt-4-turbo-2024-04-09': {
      input: 10.00,
      output: 30.00
    },
    'gpt-4': {
      input: 30.00,
      output: 60.00
    },
    'gpt-3.5-turbo': {
      input: 0.50,
      output: 1.50
    },
    'gpt-3.5-turbo-0125': {
      input: 0.50,
      output: 1.50
    },
    'o1-preview': {
      input: 15.00,
      output: 60.00
    },
    'o1-preview-2024-09-12': {
      input: 15.00,
      output: 60.00
    },
    'o1-mini': {
      input: 3.00,
      output: 12.00
    },
    'o1-mini-2024-09-12': {
      input: 3.00,
      output: 12.00
    },

    // Google Gemini Models
    'gemini-1.5-pro': {
      input: 1.25,
      output: 5.00
    },
    'gemini-1.5-pro-002': {
      input: 1.25,
      output: 5.00
    },
    'gemini-1.5-flash': {
      input: 0.075,
      output: 0.30
    },
    'gemini-1.5-flash-002': {
      input: 0.075,
      output: 0.30
    },
    'gemini-1.5-flash-8b': {
      input: 0.0375,
      output: 0.15
    },
    'gemini-1.0-pro': {
      input: 0.50,
      output: 1.50
    },
    'gemini-2.0-flash-exp': {
      input: 0.075,
      output: 0.30
    },

    // xAI Grok Models
    'grok-beta': {
      input: 5.00,
      output: 15.00
    },
    'grok-2-1212': {
      input: 2.00,
      output: 10.00
    },
    'grok-2-vision-1212': {
      input: 2.00,
      output: 10.00
    },

    // Cohere Models
    'command-r-plus': {
      input: 2.50,
      output: 10.00
    },
    'command-r': {
      input: 0.15,
      output: 0.60
    },
    'command': {
      input: 1.00,
      output: 2.00
    },
    'command-light': {
      input: 0.30,
      output: 0.60
    },

    // Meta Models
    'llama-3.2-1b': {
      input: 0.10,
      output: 0.10
    },
    'llama-3.2-3b': {
      input: 0.10,
      output: 0.10
    },
    'llama-3.2-11b': {
      input: 0.35,
      output: 0.40
    },
    'llama-3.2-90b': {
      input: 1.20,
      output: 1.20
    },
    'llama-3.1-8b': {
      input: 0.18,
      output: 0.18
    },
    'llama-3.1-70b': {
      input: 0.99,
      output: 0.99
    },
    'llama-3.1-405b': {
      input: 5.32,
      output: 16.00
    }
  } as const;

  // Model aliases for LangChain compatibility
  private static readonly MODEL_ALIASES = {
    'claude-3-5-sonnet': 'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku': 'claude-3-5-haiku-20241022',
    'claude-3-opus': 'claude-3-opus-20240229',
    'claude-3-sonnet': 'claude-3-sonnet-20240229',
    'claude-3-haiku': 'claude-3-haiku-20240307',
    'gpt-4': 'gpt-4',
    'gpt-3.5': 'gpt-3.5-turbo',
    'gemini-pro': 'gemini-1.5-pro',
    'gemini-flash': 'gemini-1.5-flash',
    'grok': 'grok-beta'
  } as const;

  constructor(_apiKey: string) {
    // Token counting implementation using estimation
  }

  /**
   * Count tokens for a message before sending
   */
  async countTokens(params: {
    model: string;
    system?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    tools?: any[];
  }): Promise<{ input_tokens: number }> {
    try {
      // Note: Token counting API might not be available in all SDK versions
      // For now, use estimation method
      return { input_tokens: this.estimateTokens(params) };
    } catch (error) {
      // Fallback estimation if API call fails
      console.warn('Token counting failed, using estimation:', error);
      return { input_tokens: this.estimateTokens(params) };
    }
  }

  /**
   * Calculate cost based on token usage
   */
  calculateCost(model: string, inputTokens: number, outputTokens: number): {
    inputCost: number;
    outputCost: number;
    totalCost: number;
    formattedCost: string;
    detailedCost: string;
  } {
    // Resolve model alias if exists
    const resolvedModel = this.resolveModelAlias(model);
    const modelKey = resolvedModel as keyof typeof TokenCounter.PRICING;
    const pricing = TokenCounter.PRICING[modelKey];
    
    if (!pricing) {
      return {
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
        formattedCost: `Unknown model: ${model}`,
        detailedCost: `Model '${model}' pricing not available.\nSupported models: ${this.getSupportedModels().slice(0, 5).join(', ')}...`
      };
    }

    // Convert tokens to millions and calculate cost
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    const totalCost = inputCost + outputCost;

    // Create detailed cost breakdown with line breaks
    const detailedCost = this.formatDetailedCost({
      model: resolvedModel,
      inputTokens,
      outputTokens,
      inputCost,
      outputCost,
      totalCost,
      inputRate: pricing.input,
      outputRate: pricing.output
    });

    return {
      inputCost,
      outputCost,
      totalCost,
      formattedCost: this.formatCost(totalCost),
      detailedCost
    };
  }

  /**
   * Format cost for display
   */
  private formatCost(cost: number): string {
    if (cost === 0) {
      return '$0.0000';
    } else if (cost < 0.0001) {
      return `$${(cost * 1000000).toFixed(2)}µ`; // Show in millionths for very small amounts
    } else if (cost < 0.001) {
      return `$${(cost * 1000).toFixed(3)}m`; // Show in thousandths
    } else if (cost < 0.01) {
      return `$${(cost * 100).toFixed(2)}¢`; // Show in cents
    } else if (cost < 1) {
      return `$${cost.toFixed(4)}`;
    } else {
      return `$${cost.toFixed(2)}`;
    }
  }

  /**
   * Format detailed cost breakdown with line breaks
   */
  private formatDetailedCost(params: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
    inputRate: number;
    outputRate: number;
  }): string {
    const {
      model,
      inputTokens,
      outputTokens,
      inputCost,
      outputCost,
      totalCost,
      inputRate,
      outputRate
    } = params;

    return [
      `Model: ${model}`,
      `Input: ${TokenCounter.formatTokenCount(inputTokens)} × $${inputRate}/M = ${this.formatCost(inputCost)}`,
      `Output: ${TokenCounter.formatTokenCount(outputTokens)} × $${outputRate}/M = ${this.formatCost(outputCost)}`,
      `Total Cost: ${this.formatCost(totalCost)}`
    ].join('\n');
  }

  /**
   * Resolve model alias to actual model name
   */
  private resolveModelAlias(model: string): string {
    const aliasKey = model as keyof typeof TokenCounter.MODEL_ALIASES;
    return TokenCounter.MODEL_ALIASES[aliasKey] || model;
  }

  /**
   * Get list of supported models
   */
  private getSupportedModels(): string[] {
    return Object.keys(TokenCounter.PRICING);
  }

  /**
   * Simple token estimation fallback
   */
  private estimateTokens(params: {
    system?: string;
    messages: Array<{ role: string; content: string }>;
    tools?: any[];
  }): number {
    let totalText = params.system || '';
    
    for (const message of params.messages) {
      totalText += message.content;
    }
    
    if (params.tools) {
      totalText += JSON.stringify(params.tools);
    }
    
    // Rough estimation: ~4 characters per token
    return Math.ceil(totalText.length / 4);
  }

  /**
   * Get pricing information for a model
   */
  static getModelPricing(model: string): { input: number; output: number } | null {
    // Resolve alias first
    const aliasKey = model as keyof typeof TokenCounter.MODEL_ALIASES;
    const resolvedModel = TokenCounter.MODEL_ALIASES[aliasKey] || model;
    const modelKey = resolvedModel as keyof typeof TokenCounter.PRICING;
    return TokenCounter.PRICING[modelKey] || null;
  }

  /**
   * Get all supported models including aliases
   */
  static getAllSupportedModels(): {
    models: string[];
    aliases: Record<string, string>;
    totalCount: number;
  } {
    const models = Object.keys(TokenCounter.PRICING);
    const aliases = { ...TokenCounter.MODEL_ALIASES };
    
    return {
      models,
      aliases,
      totalCount: models.length + Object.keys(aliases).length
    };
  }

  /**
   * Check if a model is supported (including aliases)
   */
  static isModelSupported(model: string): boolean {
    const aliasKey = model as keyof typeof TokenCounter.MODEL_ALIASES;
    const resolvedModel = TokenCounter.MODEL_ALIASES[aliasKey] || model;
    const modelKey = resolvedModel as keyof typeof TokenCounter.PRICING;
    return !!TokenCounter.PRICING[modelKey];
  }

  /**
   * Format token count for display
   */
  static formatTokenCount(tokens: number): string {
    if (tokens < 1000) {
      return `${tokens} tokens`;
    } else if (tokens < 1_000_000) {
      return `${(tokens / 1000).toFixed(1)}K tokens`;
    } else {
      return `${(tokens / 1_000_000).toFixed(2)}M tokens`;
    }
  }

  /**
   * Get pricing summary for display
   */
  static getPricingSummary(): string {
    const supportedModels = TokenCounter.getAllSupportedModels();
    const modelCount = supportedModels.totalCount;
    
    return [
      `✅ ${supportedModels.models.length} Models Supported`,
      `🔗 ${Object.keys(supportedModels.aliases).length} Aliases Available`,
      `📊 Total: ${modelCount} Model Variants`,
      ``,
      `Providers: Anthropic, OpenAI, Google, xAI, Cohere, Meta`,
      `Cost Range: $0.0375/M - $75.00/M tokens`
    ].join('\n');
  }
}
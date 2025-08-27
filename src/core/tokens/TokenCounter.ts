/**
 * Token counting and pricing utility for OpenClaude
 */
export class TokenCounter {
  // Pricing per million tokens (input/output)
  private static readonly PRICING = {
    'claude-sonnet-4-20250514': {
      input: 3.00,  // $3 per million input tokens
      output: 15.00 // $15 per million output tokens
    },
    'claude-opus-4-20250514': {
      input: 15.00,  // $15 per million input tokens
      output: 75.00  // $75 per million output tokens
    }
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
  } {
    const modelKey = model as keyof typeof TokenCounter.PRICING;
    const pricing = TokenCounter.PRICING[modelKey];
    
    if (!pricing) {
      return {
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
        formattedCost: 'Unknown model pricing'
      };
    }

    // Convert tokens to millions and calculate cost
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    const totalCost = inputCost + outputCost;

    return {
      inputCost,
      outputCost,
      totalCost,
      formattedCost: this.formatCost(totalCost)
    };
  }

  /**
   * Format cost for display
   */
  private formatCost(cost: number): string {
    if (cost < 0.001) {
      return `$${(cost * 1000).toFixed(4)}k`; // Show in thousandths for very small amounts
    } else if (cost < 0.01) {
      return `$${(cost * 100).toFixed(3)}¢`; // Show in cents
    } else if (cost < 1) {
      return `$${cost.toFixed(4)}`;
    } else {
      return `$${cost.toFixed(2)}`;
    }
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
    const modelKey = model as keyof typeof TokenCounter.PRICING;
    return TokenCounter.PRICING[modelKey] || null;
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
}
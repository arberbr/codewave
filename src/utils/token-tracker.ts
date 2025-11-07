// src/utils/token-tracker.ts
// Token usage tracking and cost calculation for LLM calls

export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
}

export interface CostCalculation {
    inputCost: number;
    outputCost: number;
    totalCost: number;
}

/**
 * Token pricing per million tokens (as of Nov 2025)
 */
export const TOKEN_PRICING = {
    anthropic: {
        'claude-sonnet-4-5-20250929': {
            input: 3.00,  // $3 per million input tokens
            output: 15.00, // $15 per million output tokens
        },
        'claude-sonnet-4-20250514': {
            input: 3.00,
            output: 15.00,
        },
        'claude-3-5-sonnet-20241022': {
            input: 3.00,
            output: 15.00,
        },
    },
    openai: {
        'gpt-4o': {
            input: 2.50,
            output: 10.00,
        },
        'gpt-4o-mini': {
            input: 0.15,
            output: 0.60,
        },
    },
    google: {
        'gemini-2.0-flash-exp': {
            input: 0.00,  // Free tier
            output: 0.00,
        },
        'gemini-1.5-pro': {
            input: 1.25,
            output: 5.00,
        },
    },
};

/**
 * Calculate cost for token usage
 * @param provider LLM provider (anthropic, openai, google)
 * @param model Model name
 * @param tokenUsage Token usage statistics
 * @returns Cost calculation
 */
export function calculateCost(
    provider: string,
    model: string,
    tokenUsage: TokenUsage,
): CostCalculation {
    const providerPricing = TOKEN_PRICING[provider as keyof typeof TOKEN_PRICING];
    if (!providerPricing) {
        console.warn(`Unknown provider: ${provider}, using zero cost`);
        return { inputCost: 0, outputCost: 0, totalCost: 0 };
    }

    const pricing = providerPricing[model as keyof typeof providerPricing] as { input: number; output: number } | undefined;

    if (!pricing) {
        console.warn(`Unknown pricing for ${provider}/${model}, using zero cost`);
        return {
            inputCost: 0,
            outputCost: 0,
            totalCost: 0,
        };
    }

    const inputCost = (tokenUsage.inputTokens / 1_000_000) * pricing.input;
    const outputCost = (tokenUsage.outputTokens / 1_000_000) * pricing.output;

    return {
        inputCost,
        outputCost,
        totalCost: inputCost + outputCost,
    };
}

/**
 * Format token usage for logging
 */
export function formatTokenUsage(tokenUsage: TokenUsage): string {
    return `${tokenUsage.totalTokens.toLocaleString()} (in: ${tokenUsage.inputTokens.toLocaleString()}, out: ${tokenUsage.outputTokens.toLocaleString()})`;
}

/**
 * Format cost for logging
 */
export function formatCost(cost: number): string {
    return `$${cost.toFixed(4)}`;
}

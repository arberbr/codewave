import { AppConfig } from '../config/config.interface';
import { TOKEN_PRICING, formatCost } from '../utils/token-tracker';

export interface CostEstimate {
    average: {
        inputTokens: number;
        outputTokens: number;
        inputCost: number;
        outputCost: number;
        totalCost: number;
    };
    maximum: {
        inputTokens: number;
        outputTokens: number;
        inputCost: number;
        outputCost: number;
        totalCost: number;
    };
}

/**
 * Service for estimating LLM costs based on token usage
 *
 * Uses real data from 92 agent evaluations:
 * - Per agent input: ~3,360 tokens (includes diff + system prompt + discussion context)
 * - Per agent output: ~149 tokens (intentionally constrained for cost efficiency)
 * - All 5 agents evaluate each commit independently
 * - Outputs are constrained: summary max 150 chars, details max 400 chars
 */
export class CostEstimatorService {
    // Real token usage data from evaluated commits (92 agent evaluations analyzed):
    private readonly AVG_INPUT_TOKENS_PER_AGENT = 3360;
    private readonly MAX_INPUT_TOKENS_PER_AGENT = 13083;
    private readonly AVG_OUTPUT_TOKENS_PER_AGENT = 149;
    private readonly MAX_OUTPUT_TOKENS_PER_AGENT = 171;
    private readonly NUM_AGENTS = 5; // 5 agents evaluate each commit

    constructor(private config: AppConfig) {}

    /**
     * Estimate cost for evaluating multiple commits
     */
    estimateForCommits(commitCount: number): CostEstimate | null {
        try {
            const provider = this.config.llm.provider;
            const model = this.config.llm.model;

            // Get pricing info
            const providerPricing = TOKEN_PRICING[provider as keyof typeof TOKEN_PRICING];
            if (!providerPricing) {
                return null; // Unknown provider
            }

            const pricing = providerPricing[model as keyof typeof providerPricing] as
                | { input: number; output: number }
                | undefined;
            if (!pricing) {
                return null; // Unknown model
            }

            // Calculate per-commit tokens
            const AVG_INPUT_TOKENS_PER_COMMIT = this.AVG_INPUT_TOKENS_PER_AGENT * this.NUM_AGENTS;
            const AVG_OUTPUT_TOKENS_PER_COMMIT = this.AVG_OUTPUT_TOKENS_PER_AGENT * this.NUM_AGENTS;
            const MAX_INPUT_TOKENS_PER_COMMIT = this.MAX_INPUT_TOKENS_PER_AGENT * this.NUM_AGENTS;
            const MAX_OUTPUT_TOKENS_PER_COMMIT = this.MAX_OUTPUT_TOKENS_PER_AGENT * this.NUM_AGENTS;

            // Average case
            const avgInputTokens = commitCount * AVG_INPUT_TOKENS_PER_COMMIT;
            const avgOutputTokens = commitCount * AVG_OUTPUT_TOKENS_PER_COMMIT;
            const avgInputCost = (avgInputTokens / 1_000_000) * pricing.input;
            const avgOutputCost = (avgOutputTokens / 1_000_000) * pricing.output;
            const avgTotalCost = avgInputCost + avgOutputCost;

            // Maximum case (worst case scenario)
            const maxInputTokens = commitCount * MAX_INPUT_TOKENS_PER_COMMIT;
            const maxOutputTokens = commitCount * MAX_OUTPUT_TOKENS_PER_COMMIT;
            const maxInputCost = (maxInputTokens / 1_000_000) * pricing.input;
            const maxOutputCost = (maxOutputTokens / 1_000_000) * pricing.output;
            const maxTotalCost = maxInputCost + maxOutputCost;

            return {
                average: {
                    inputTokens: avgInputTokens,
                    outputTokens: avgOutputTokens,
                    inputCost: avgInputCost,
                    outputCost: avgOutputCost,
                    totalCost: avgTotalCost,
                },
                maximum: {
                    inputTokens: maxInputTokens,
                    outputTokens: maxOutputTokens,
                    inputCost: maxInputCost,
                    outputCost: maxOutputCost,
                    totalCost: maxTotalCost,
                },
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Print cost estimation with detailed breakdown
     */
    printEstimate(estimate: CostEstimate, commitCount: number): void {
        const provider = this.config.llm.provider;
        const model = this.config.llm.model;
        const pricing = TOKEN_PRICING[provider as keyof typeof TOKEN_PRICING]?.[
            model as keyof typeof TOKEN_PRICING[keyof typeof TOKEN_PRICING]
        ] as { input: number; output: number } | undefined;

        if (!pricing) return;

        console.log('💰 Cost Estimation:');
        console.log(`   Model: ${provider}/${model}`);
        console.log(`   Commits: ${commitCount}`);
        console.log(`   Agents per commit: ${this.NUM_AGENTS}\n`);

        console.log(`   AVERAGE CASE (typical):`, formatCost(estimate.average.totalCost));
        console.log(
            `     - Input:  ${estimate.average.inputTokens.toLocaleString()} tokens @ $${pricing.input.toFixed(2)}/M = ${formatCost(estimate.average.inputCost)}`
        );
        console.log(
            `     - Output: ${estimate.average.outputTokens.toLocaleString()} tokens @ $${pricing.output.toFixed(2)}/M = ${formatCost(estimate.average.outputCost)}`
        );

        console.log(`\n   MAXIMUM CASE (complex diffs/discussions):`, formatCost(estimate.maximum.totalCost));
        console.log(
            `     - Input:  ${estimate.maximum.inputTokens.toLocaleString()} tokens @ $${pricing.input.toFixed(2)}/M = ${formatCost(estimate.maximum.inputCost)}`
        );
        console.log(
            `     - Output: ${estimate.maximum.outputTokens.toLocaleString()} tokens @ $${pricing.output.toFixed(2)}/M = ${formatCost(estimate.maximum.outputCost)}\n`
        );
    }

    /**
     * Get formatted cost string for the average case
     */
    formatAverageCost(estimate: CostEstimate): string {
        return formatCost(estimate.average.totalCost);
    }
}

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
 * IMPORTANT: This service estimates costs per individual agent evaluation (one agent, one round).
 *
 * Actual evaluation structure (as of Nov 2025):
 * - 5 agents: Business Analyst, Developer Reviewer, Developer Author, Senior Architect, SDET
 * - Each agent may run 2-3 discussion rounds (initial, concerns/questions, validation)
 * - Multi-round evaluations increase token usage significantly
 *
 * Real data from evaluated commits:
 * - Single agent evaluation: typically 2,000-13,000 input tokens
 * - Average per agent: ~11,128 input tokens (accounting for all rounds)
 * - Average per agent output: ~150 tokens
 * - Full commit evaluation (all agents, all rounds): ~55,640 input + 1,512 output tokens total
 *
 * For cost estimation:
 * - This shows the AVERAGE per agent per commit
 * - Multiply by number of agents to get full evaluation cost
 * - Note: Actual multi-round discussions typically cost 30-50% more than single-round
 */
export class CostEstimatorService {
    // Real token usage data from actual evaluated commits:
    // These represent AVERAGE per agent across all agents and rounds
    private readonly AVG_INPUT_TOKENS_PER_AGENT = 11128; // Updated from real data
    private readonly MAX_INPUT_TOKENS_PER_AGENT = 13083;
    private readonly AVG_OUTPUT_TOKENS_PER_AGENT = 151; // Updated from real data
    private readonly MAX_OUTPUT_TOKENS_PER_AGENT = 174;
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

        const totalAgents = commitCount * this.NUM_AGENTS;
        const perCommitAverage = estimate.average.totalCost / commitCount;
        const perAgentAverage = perCommitAverage / this.NUM_AGENTS;

        console.log('💰 Cost Estimation:');
        console.log(`   Model: ${provider}/${model}`);
        console.log(`   Commits to evaluate: ${commitCount}`);
        console.log(`   Agents per commit: ${this.NUM_AGENTS}`);
        console.log(`   Total agent evaluations: ${totalAgents}\n`);

        console.log(`   ℹ️  Note: These estimates are based on multi-round evaluations (typically 10 agents per commit after all discussion rounds)\n`);

        console.log(`   📊 AVERAGE CASE (typical multi-round discussion):`);
        console.log(`     Total cost for ${commitCount} commits: ${formatCost(estimate.average.totalCost)}`);
        console.log(`     Per commit: ${formatCost(perCommitAverage)}`);
        console.log(`     Per agent: ${formatCost(perAgentAverage)}`);
        console.log(
            `     - Input:  ${estimate.average.inputTokens.toLocaleString()} tokens @ $${pricing.input.toFixed(2)}/M = ${formatCost(estimate.average.inputCost)}`
        );
        console.log(
            `     - Output: ${estimate.average.outputTokens.toLocaleString()} tokens @ $${pricing.output.toFixed(2)}/M = ${formatCost(estimate.average.outputCost)}`
        );

        console.log(`\n   📈 MAXIMUM CASE (complex diffs or extended discussions):`);
        console.log(`     Total cost for ${commitCount} commits: ${formatCost(estimate.maximum.totalCost)}`);
        console.log(`     Per commit: ${formatCost(estimate.maximum.totalCost / commitCount)}`);
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

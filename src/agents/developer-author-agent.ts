// src/agents/developer-author-agent.ts
// Developer (Commit Author) Agent - Explains implementation decisions and actual time spent

import { AppConfig } from '../config/config.interface';
import { BaseAgentWorkflow } from './base-agent-workflow';
import { AgentContext, AgentResult } from './agent.interface';

export class DeveloperAuthorAgent extends BaseAgentWorkflow {
    private config: AppConfig;

    constructor(config: AppConfig) {
        super();
        this.config = config;
    }

    getMetadata() {
        return {
            name: 'developer-author',
            description: 'Explains implementation decisions, trade-offs, and estimates actual time spent',
            role: 'Developer (Author)',
        };
    }

    async canExecute(context: AgentContext) {
        return !!context.commitDiff;
    }

    async estimateTokens(context: AgentContext) {
        return 2000;
    }

    protected buildSystemPrompt(context: AgentContext): string {
        const roundPurpose = context.roundPurpose || 'initial';
        const previousContext =
            context.agentResults && context.agentResults.length > 0
                ? '\n\n## Team Discussion So Far\n\n' +
                context.agentResults
                    .map((r: AgentResult, idx: number) => `**${this.detectAgentRole(r)}**: ${r.summary}`)
                    .join('\n\n')
                : '';

        // Round-specific instructions
        const roundInstructions = roundPurpose === 'initial'
            ? '## Round 1: Initial Analysis\nProvide your independent assessment as the commit author.'
            : roundPurpose === 'concerns'
                ? '## Round 2: Raise Concerns & Questions\nReview other agents\' scores. If implementation time seems inconsistent with their assessments (e.g., Architect says complex but BA says quick work, or Reviewer says poor quality despite time spent), raise questions. Defend your actual time estimate if challenged.'
                : '## Round 3: Validation & Final Scores\nRespond to concerns about YOUR actual time score. Validate or adjust other metrics based on agent feedback. Provide final refined scores.';

        return [
            '# Role: Developer (Commit Author)',
            '',
            'You are the Developer who authored this commit, participating in a code review discussion.',
            'Your task is to evaluate the commit across ALL 7 pillars, with special focus on actual implementation time.',
            '',
            roundInstructions,
            '',
            '## Scoring Philosophy',
            'You will score ALL 7 metrics below. Your PRIMARY expertise (⭐) carries 45.5% weight in final calculation.',
            'Your secondary opinions (16-18% weight) provide valuable implementation insights.',
            '',
            '## Metrics to Score',
            '',
            '### ⭐ 1. Actual Time Hours - YOUR PRIMARY EXPERTISE (45.5% weight)',
            '**Definition**: How much time was ACTUALLY spent implementing this change',
            '- **0.5-1h**: Quick fixes, simple changes',
            '- **1-4h**: Small features, straightforward implementations',
            '- **5-16h**: Moderate features, some complexity encountered',
            '- **17-40h**: Significant features, substantial work',
            '- **40h+**: Large-scale changes, major effort',
            '',
            '### 2. Functional Impact (1-10) - Tertiary Opinion (13% weight)',
            '**Definition**: User-facing impact from implementation perspective',
            '- **9-10**: Major feature affecting many users',
            '- **5-6**: Moderate feature or improvement',
            '- **1-2**: Internal change, minimal user impact',
            '',
            '### 3. Ideal Time Hours - Secondary Opinion (16.7% weight)',
            '**Definition**: How long this SHOULD have taken ideally',
            'Compare against actual time spent - was it efficient?',
            '',
            '### 4. Test Coverage (1-10) - Tertiary Opinion (12% weight)',
            '**Definition**: Tests you wrote for this change',
            '- **9-10**: Comprehensive tests written',
            '- **5-6**: Basic tests covered',
            '- **1-2**: Minimal or no tests',
            '',
            '### 5. Code Quality (1-10) - Tertiary Opinion (12.5% weight)',
            '**Definition**: Quality of your implementation',
            '- **9-10**: Very clean, well-structured code',
            '- **5-6**: Acceptable quality, some shortcuts',
            '- **1-2**: Quick-and-dirty implementation',
            '',
            '### 6. Code Complexity (1-10, lower is better) - Secondary Opinion (16.7% weight)',
            '**Definition**: Complexity you introduced',
            '- **1-2**: Simple, straightforward solution',
            '- **5-6**: Moderate complexity needed',
            '- **9-10**: Complex implementation required',
            '',
            '### 7. Technical Debt Hours - Tertiary Opinion (13% weight)',
            '**Definition**: Debt introduced or paid down',
            '- **Negative**: Cleaned up existing issues',
            '- **0**: Neutral, no debt added',
            '- **Positive**: Shortcuts taken, future work needed',
            '',
            '## Output Requirements',
            '',
            '**You MUST return ONLY valid JSON** in the following format:',
            '',
            '{',
            '  "summary": "A conversational 2-3 sentence overview (e.g., \'I spent about X hours on this...\')",',
            '  "details": "Detailed explanation of implementation decisions, time breakdown, and challenges. Reference your PRIMARY expertise and provide context for other scores.",',
            '  "metrics": {',
            '    "actualTimeHours": <number in hours>,',
            '    "functionalImpact": <number 1-10>,',
            '    "idealTimeHours": <number in hours>,',
            '    "testCoverage": <number 1-10>,',
            '    "codeQuality": <number 1-10>,',
            '    "codeComplexity": <number 1-10>,',
            '    "technicalDebtHours": <number in hours, can be negative>',
            '  }',
            '}',
            '',
            '## Important Notes',
            '- Be confident in YOUR PRIMARY area (actualTimeHours) - you know exactly how long it took',
            '- Be honest about implementation quality and shortcuts taken',
            '- ALL 7 metrics are required',
            '- Respond to other team members\' concerns',
            previousContext,
        ].join('\n');
    }

    protected async buildHumanPrompt(context: AgentContext): Promise<string> {
        const filesChanged = context.filesChanged?.join(', ') || 'unknown files';

        // Use RAG if available for large diffs (skip in subsequent rounds to save tokens)
        const isFirstRound = !context.agentResults || context.agentResults.length === 0;
        if (context.vectorStore && isFirstRound) {
            const { RAGHelper } = await import('../utils/rag-helper.js');
            const rag = new RAGHelper(context.vectorStore);

            // Ask implementation-focused questions (optimized for cost)
            const queries = [
                { q: 'Show all source code changes excluding tests and documentation', topK: 3 },
                { q: 'What refactoring or code organization changes occurred?', topK: 2 },
                { q: 'Show new features or functionality added', topK: 2 },
            ];

            const results = await rag.queryMultiple(queries);
            const ragContext = results.map(r => r.results).join('\n\n');

            return [
                '## Implementation Review (RAG Mode - Large Diff)',
                '',
                `**Files Changed:** ${filesChanged}`,
                '',
                rag.getSummary(),
                '',
                '**Your Implementation - Relevant Code:**',
                ragContext,
                '',
                'As the developer who wrote this code, please score ALL 7 metrics based on the relevant code shown above:',
                '1. **Actual Time Hours** - YOUR PRIMARY EXPERTISE (how long you actually spent)',
                '2. **Functional Impact** (1-10) - your tertiary opinion',
                '3. **Ideal Time Hours** - your secondary opinion (should it have been faster?)',
                '4. **Test Coverage** (1-10) - your tertiary opinion (tests you wrote)',
                '5. **Code Quality** (1-10) - your tertiary assessment',
                '6. **Code Complexity** (1-10, lower is better) - your secondary opinion',
                '7. **Technical Debt Hours** - your tertiary assessment (shortcuts taken?)',
                '',
                'Explain your implementation decisions, time breakdown, and respond to other team members.',
                '',
                'Respond conversationally, as if defending/explaining your work in a code review.',
            ].join('\n');
        }

        // Round 2 (Concerns): Ask questions about other agents' scores
        const roundPurpose = context.roundPurpose || 'initial';
        if (roundPurpose === 'concerns' && context.agentResults && context.agentResults.length > 0) {
            const teamContext = context.agentResults
                .map(r => `**${r.agentName}:**\n${r.summary}\n\nMetrics: ${JSON.stringify(r.metrics, null, 2)}`)
                .join('\n\n---\n\n');

            return [
                '## Implementation Review - Round 2: Raise Concerns & Questions',
                '',
                `**Files Changed:** ${filesChanged}`,
                '',
                '**Team Discussion (Round 1):**',
                teamContext,
                '',
                '**Your Task:**',
                '1. Review other agents\' scores - do they reflect the work you did?',
                '2. Raise concerns about implementation-related scores:',
                '   - Complexity → Senior Architect (was it really that complex?)',
                '   - Code Quality → Developer Reviewer (did they miss context?)',
                '   - Ideal Time → Business Analyst (did they account for challenges?)',
                '   - Test Coverage → QA Engineer (did they notice your test approach?)',
                '3. Defend your Actual Time score - explain what took time',
                '',
                'Include your refined scores based on team discussion.',
            ].join('\n');
        }

        // Round 3 (Validation): Respond to concerns and finalize
        if (roundPurpose === 'validation' && context.agentResults && context.agentResults.length > 0) {
            const teamContext = context.agentResults
                .map(r => `**${r.agentName}:**\n${r.summary}\n\nMetrics: ${JSON.stringify(r.metrics, null, 2)}`)
                .join('\n\n---\n\n');

            return [
                '## Implementation Review - Round 3: Validation & Final Scores',
                '',
                `**Files Changed:** ${filesChanged}`,
                '',
                '**Team Discussion (Rounds 1-2):**',
                teamContext,
                '',
                '**Your Task:**',
                '1. Address concerns about YOUR Actual Time score',
                '2. Review responses from Architect, Reviewer, QA, BA',
                '3. Adjust scores if their feedback changes your assessment',
                '4. Provide FINAL refined scores for all 7 metrics',
                '',
                'This is the final round - clarify your implementation decisions.',
            ].join('\n');
        }

        // Fallback to full diff for small commits (no RAG needed)
        return [
            '## Implementation Review',
            '',
            `**Files Changed:** ${filesChanged}`,
            '',
            '**Your Implementation:**',
            '```',
            context.commitDiff,
            '```',
            '',
            'As the developer who wrote this code, please score ALL 7 metrics:',
            '1. **Actual Time Hours** - YOUR PRIMARY EXPERTISE (how long you actually spent)',
            '2. **Functional Impact** (1-10) - your tertiary opinion',
            '3. **Ideal Time Hours** - your secondary opinion (should it have been faster?)',
            '4. **Test Coverage** (1-10) - your tertiary opinion (tests you wrote)',
            '5. **Code Quality** (1-10) - your tertiary assessment',
            '6. **Code Complexity** (1-10, lower is better) - your secondary opinion',
            '7. **Technical Debt Hours** - your tertiary assessment (shortcuts taken?)',
            '',
            'Explain your implementation decisions, time breakdown, and respond to other team members.',
            '',
            'Respond conversationally, as if defending/explaining your work in a code review.',
        ].join('\n');
    }

    protected parseLLMResult(output: any): AgentResult {
        // Try to parse JSON output from LLM
        if (typeof output === 'string') {
            try {
                // Strip markdown code fences if present
                let cleanOutput = output.trim();
                if (cleanOutput.startsWith('```json') || cleanOutput.startsWith('```')) {
                    cleanOutput = cleanOutput.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
                }

                const parsed = JSON.parse(cleanOutput);

                // Validate required fields
                if (!parsed.summary || typeof parsed.summary !== 'string') {
                    console.warn(`Developer Author: Invalid summary in LLM response`);
                    throw new Error('Missing or invalid summary field');
                }

                return {
                    summary: parsed.summary.trim(),
                    details: (parsed.details || '').trim(),
                    metrics: parsed.metrics || {
                        actualTimeHours: 0,
                        functionalImpact: 5,
                        idealTimeHours: 0,
                        testCoverage: 5,
                        codeQuality: 5,
                        codeComplexity: 5,
                        technicalDebtHours: 0,
                    },
                };
            } catch (error) {
                console.warn(`Developer Author: Failed to parse LLM output: ${error instanceof Error ? error.message : String(error)}`);

                // fallback to string summary (if output is long enough)
                if (output.length > 10) {
                    return {
                        summary: output.substring(0, 500),
                        details: '',
                        metrics: { actualTimeHours: 0 },
                    };
                }

                return {
                    summary: '',
                    details: 'Failed to parse LLM response',
                    metrics: {},
                };
            }
        }
        return super.parseLLMResult(output);
    }

    private detectAgentRole(result: AgentResult): string {
        const combined = (result.summary || '').toLowerCase() + (result.details || '').toLowerCase();
        if (combined.includes('business') || combined.includes('functional')) return 'Business Analyst';
        if (combined.includes('qa') || combined.includes('test')) return 'QA Engineer';
        if (combined.includes('architect')) return 'Senior Architect';
        if (combined.includes('reviewer')) return 'Code Reviewer';
        return 'Team Member';
    }
}

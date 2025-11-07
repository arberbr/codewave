// src/agents/senior-architect-agent.ts
// Senior Architect Agent - Evaluates code complexity and technical debt

import { AppConfig } from '../config/config.interface';
import { BaseAgentWorkflow } from './base-agent-workflow';
import { AgentContext, AgentResult } from './agent.interface';

export class SeniorArchitectAgent extends BaseAgentWorkflow {
    private config: AppConfig;

    constructor(config: AppConfig) {
        super();
        this.config = config;
    }

    getMetadata() {
        return {
            name: 'senior-architect',
            description: 'Evaluates architecture, design patterns, code complexity, and technical debt',
            role: 'Senior Architect',
        };
    }

    async canExecute(context: AgentContext) {
        return !!context.commitDiff;
    }

    async estimateTokens(context: AgentContext) {
        return 2500;
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
            ? '## Round 1: Initial Analysis\nProvide your independent architectural assessment of all 7 metrics.'
            : roundPurpose === 'concerns'
                ? '## Round 2: Raise Concerns & Questions\nReview other agents\' scores. If complexity/debt scores seem inconsistent (e.g., QA says simple tests but you see high complexity, Author claims quick work but architecture is complex), raise questions. Defend your complexity and debt assessments if challenged.'
                : '## Round 3: Validation & Final Scores\nRespond to concerns about YOUR complexity and technical debt scores. Validate or adjust other metrics based on agent responses. Provide final refined scores.';

        return [
            '# Role: Senior Architect',
            '',
            'You are a Senior Architect participating in a code review discussion.',
            'Your task is to evaluate the commit across ALL 7 pillars, with special focus on complexity and technical debt.',
            '',
            roundInstructions,
            '',
            '## Scoring Philosophy',
            'You will score ALL 7 metrics below. Your PRIMARY expertise (⭐) carries 41-44% weight in final calculation.',
            'Your secondary opinions (16-21% weight) provide valuable architectural insights.',
            '',
            '## Metrics to Score',
            '',
            '### ⭐ 1. Code Complexity (1-10, lower is better) - YOUR PRIMARY EXPERTISE (41.7% weight)',
            '**Definition**: Overall complexity of the implementation',
            '- **1-2 (Minimal)**: Very simple, straightforward code, easy to understand',
            '- **3-4 (Low)**: Simple logic, clean structure, few dependencies',
            '- **5-6 (Moderate)**: Some complexity, multiple components, manageable',
            '- **7-8 (High)**: Complex logic, many interdependencies, hard to follow',
            '- **9-10 (Extreme)**: Highly complex, convoluted, very difficult to understand',
            '**IMPORTANT**: Score 1 is BEST (simplest), score 10 is WORST (most complex)',
            '',
            '### ⭐ 2. Technical Debt Hours - YOUR PRIMARY EXPERTISE (43.5% weight)',
            '**Definition**: Time debt introduced (+) or reduced (-) by this change',
            '- **Negative values (debt reduced)**: -8h or lower (major cleanup), -4 to -1h (minor cleanup)',
            '- **Zero (0)**: Neutral, no debt added or removed',
            '- **Positive values (debt added)**: +1 to +4h (minor shortcuts), +4 to +8h (moderate debt), +8h+ (significant debt)',
            '',
            '### 3. Functional Impact (1-10) - Secondary Opinion (17.4% weight)',
            '**Definition**: Architectural significance of functionality',
            '- **9-10**: Core architecture change',
            '- **5-6**: Moderate architectural impact',
            '- **1-2**: Minor implementation detail',
            '',
            '### 4. Ideal Time Hours - Secondary Opinion (20.8% weight)',
            '**Definition**: Optimal implementation time from architecture perspective',
            'Consider complexity needed - simple architecture should be quick.',
            '',
            '### 5. Test Coverage (1-10) - Secondary Opinion (16% weight)',
            '**Definition**: Architecture testability and NEW tests added (not existing test pass-through)',
            '- **9-10**: Highly testable design with comprehensive NEW tests',
            '- **5-6**: Moderately testable with some NEW tests',
            '- **1-2**: Hard to test OR no new tests added (score 1-2 for cosmetic/config changes)',
            '',
            '### 6. Code Quality (1-10) - Secondary Opinion (20.8% weight)',
            '**Definition**: Architectural quality and design patterns',
            '- **9-10**: Excellent architecture, solid patterns',
            '- **5-6**: Acceptable design',
            '- **1-2**: Poor architecture, anti-patterns',
            '',
            '### 7. Actual Time Hours - Secondary Opinion (18.2% weight)',
            '**Definition**: Was the complexity justified by time spent?',
            'Provide estimate based on architectural scope.',
            '',
            '## Output Requirements',
            '',
            '**You MUST return ONLY valid JSON** in the following format:',
            '',
            '{',
            '  "summary": "A conversational 2-3 sentence overview (e.g., \'From an architecture perspective...\')",',
            '  "details": "Detailed analysis of architecture, complexity drivers, and debt. Reference your PRIMARY expertise areas.",',
            '  "metrics": {',
            '    "codeComplexity": <number 1-10, where 1=simplest, 10=most complex>,',
            '    "technicalDebtHours": <number in hours, can be negative>,',
            '    "functionalImpact": <number 1-10>,',
            '    "idealTimeHours": <number in hours>,',
            '    "testCoverage": <number 1-10>,',
            '    "codeQuality": <number 1-10>,',
            '    "actualTimeHours": <number in hours>',
            '  }',
            '}',
            '',
            '## Important Notes',
            '- Be confident in YOUR PRIMARY areas (codeComplexity, technicalDebtHours)',
            '- ALL 7 metrics are required',
            '- Speak conversationally, as if you\'re in a code review meeting',
            '- Reference other team members\' concerns (e.g., "I agree with the developer that...")',
            '- Complexity score is INVERTED: 1=best (simple), 10=worst (complex)',
            '- Technical debt can be positive (bad) or negative (good)',
            '- Consider long-term maintainability, not just immediate functionality',
            '- Evaluate design patterns, SOLID principles, and architectural best practices',
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

            // Ask architecture-focused questions (optimized for cost)
            const queries = [
                { q: 'What architectural or structural changes exist?', topK: 3 },
                { q: 'Show database schema or data model changes', topK: 2 },
                { q: 'Show complex algorithms or technical debt areas', topK: 2 },
            ];

            const results = await rag.queryMultiple(queries);
            const ragContext = results.map(r => r.results).join('\n\n');

            return [
                '## Architecture Review Request (RAG Mode - Large Diff)',
                '',
                `**Files Changed:** ${filesChanged}`,
                '',
                rag.getSummary(),
                '',
                '**Relevant Code for Architecture Review:**',
                ragContext,
                '',
                'Please provide your analysis scoring ALL 7 metrics based on the relevant code shown above:',
                '1. **Code Complexity** (1-10, lower is better) - YOUR PRIMARY EXPERTISE',
                '2. **Technical Debt Hours** - YOUR PRIMARY EXPERTISE (can be negative)',
                '3. **Functional Impact** (1-10) - your secondary opinion',
                '4. **Ideal Time Hours** - your secondary opinion',
                '5. **Test Coverage** (1-10) - your secondary opinion (testability)',
                '6. **Code Quality** (1-10) - your secondary opinion (architectural quality)',
                '7. **Actual Time Hours** - your secondary estimate',
                '',
                'Focus on your expertise (complexity, debt) but provide scores for all pillars.',
                'Respond conversationally and reference other team members\' points when relevant.',
            ].join('\n');
        }

        // Round 2 (Concerns): Ask questions about other agents' scores
        const roundPurpose = context.roundPurpose || 'initial';
        if (roundPurpose === 'concerns' && context.agentResults && context.agentResults.length > 0) {
            const teamContext = context.agentResults
                .map(r => `**${r.agentName}:**\n${r.summary}\n\nMetrics: ${JSON.stringify(r.metrics, null, 2)}`)
                .join('\n\n---\n\n');

            return [
                '## Architecture Review - Round 2: Raise Concerns & Questions',
                '',
                `**Files Changed:** ${filesChanged}`,
                '',
                '**Team Discussion (Round 1):**',
                teamContext,
                '',
                '**Your Task:**',
                '1. Review other agents\' scores through architectural lens',
                '2. Raise concerns about complexity implications:',
                '   - Implementation Time → Developer Author (does time reflect complexity?)',
                '   - Code Quality → Developer Reviewer (quality vs complexity tradeoff?)',
                '   - Test Coverage → QA Engineer (are tests adequate for this complexity?)',
                '3. Defend your Complexity and Tech Debt scores if challenged',
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
                '## Architecture Review - Round 3: Validation & Final Scores',
                '',
                `**Files Changed:** ${filesChanged}`,
                '',
                '**Team Discussion (Rounds 1-2):**',
                teamContext,
                '',
                '**Your Task:**',
                '1. Address concerns about YOUR Complexity and Technical Debt scores',
                '2. Review agent responses about time, quality, tests',
                '3. Adjust scores if new architectural insights emerge',
                '4. Provide FINAL refined scores for all 7 metrics',
                '',
                'This is the final round - be confident in your architectural assessment.',
            ].join('\n');
        }

        // Fallback to full diff for small commits (no RAG needed)
        return [
            '## Architecture Review Request',
            '',
            `**Files Changed:** ${filesChanged}`,
            '',
            '**Commit Diff:**',
            '```',
            context.commitDiff,
            '```',
            '',
            'Please provide your analysis scoring ALL 7 metrics:',
            '1. **Code Complexity** (1-10, lower is better) - YOUR PRIMARY EXPERTISE',
            '2. **Technical Debt Hours** - YOUR PRIMARY EXPERTISE (can be negative)',
            '3. **Functional Impact** (1-10) - your secondary opinion',
            '4. **Ideal Time Hours** - your secondary opinion',
            '5. **Test Coverage** (1-10) - your secondary opinion (testability)',
            '6. **Code Quality** (1-10) - your secondary opinion (architectural quality)',
            '7. **Actual Time Hours** - your secondary estimate',
            '',
            'Focus on your expertise (complexity, debt) but provide scores for all pillars.',
            'Respond conversationally and reference other team members\' points when relevant.',
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
                    console.warn(`Senior Architect: Invalid summary in LLM response`);
                    throw new Error('Missing or invalid summary field');
                }

                return {
                    summary: parsed.summary.trim(),
                    details: (parsed.details || '').trim(),
                    metrics: parsed.metrics || {
                        codeComplexity: 5,
                        technicalDebtHours: 0,
                        functionalImpact: 5,
                        idealTimeHours: 0,
                        testCoverage: 5,
                        codeQuality: 5,
                        actualTimeHours: 0,
                    },
                };
            } catch (error) {
                console.warn(`Senior Architect: Failed to parse LLM output: ${error instanceof Error ? error.message : String(error)}`);

                // fallback to string summary (if output is long enough)
                if (output.length > 10) {
                    return {
                        summary: output.substring(0, 500),
                        details: '',
                        metrics: {
                            codeComplexity: 5,
                            technicalDebtHours: 0,
                            functionalImpact: 5,
                            idealTimeHours: 0,
                            testCoverage: 5,
                            codeQuality: 5,
                            actualTimeHours: 0,
                        },
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
        if (combined.includes('author') || combined.includes('developer')) return 'Developer';
        if (combined.includes('reviewer')) return 'Code Reviewer';
        return 'Team Member';
    }
}

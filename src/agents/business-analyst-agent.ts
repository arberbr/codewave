// src/agents/business-analyst-agent.ts
// Business Analyst Agent - Evaluates business value, functional impact, and ideal time estimation

import { AppConfig } from '../config/config.interface';
import { BaseAgentWorkflow } from './base-agent-workflow';
import { AgentContext, AgentResult } from './agent.interface';

export class BusinessAnalystAgent extends BaseAgentWorkflow {
    private config: AppConfig;

    constructor(config: AppConfig) {
        super();
        this.config = config;
    }

    getMetadata() {
        return {
            name: 'business-analyst',
            description: 'Evaluates business value, functional impact, and estimates ideal implementation time',
            role: 'Business Analyst',
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
            ? '## Round 1: Initial Analysis\nProvide your independent analysis of all 7 metrics based on the code changes.'
            : roundPurpose === 'concerns'
                ? '## Round 2: Raise Concerns & Questions\nReview other agents\' scores. If you have concerns about metrics outside your expertise (e.g., test coverage from QA, code quality from Reviewer, complexity from Architect), raise specific questions. Also defend your functional impact and ideal time estimates if challenged.'
                : '## Round 3: Validation & Final Scores\nRespond to any concerns raised about YOUR functional impact and ideal time scores. Validate or adjust your other metric scores based on responses from responsible agents. Provide final refined scores.';

        return [
            '# Role: Business Analyst',
            '',
            'You are a Business Analyst participating in a code review discussion.',
            'Your task is to evaluate the commit across ALL 7 pillars, with special focus on your expertise areas.',
            '',
            roundInstructions,
            '',
            '## Scoring Philosophy',
            'You will score ALL 7 metrics below. Your PRIMARY expertise (⭐) carries 40-45% weight in final calculation.',
            'Your secondary/tertiary opinions (8-17% weight) still contribute valuable perspectives.',
            '',
            '## Metrics to Score',
            '',
            '### ⭐ 1. Functional Impact (1-10) - YOUR PRIMARY EXPERTISE (43.5% weight)',
            '**Definition**: How significantly this change affects end users or business operations',
            '- **9-10 (Critical)**: Core functionality changes, major new features, system-wide impacts',
            '- **7-8 (High)**: Significant new features, important improvements, noticeable user impact',
            '- **5-6 (Moderate)**: New minor features, noticeable improvements, moderate user value',
            '- **3-4 (Low)**: Minor improvements, edge case fixes, small optimizations',
            '- **1-2 (Minimal)**: Internal refactoring, no user-facing changes, technical cleanup',
            '',
            '### ⭐ 2. Ideal Time Hours - YOUR PRIMARY EXPERTISE (41.7% weight)',
            '**Definition**: How long this SHOULD take if implemented optimally',
            '- **0.5-1h**: Trivial changes (typos, config tweaks, tiny fixes)',
            '- **1-4h**: Small features, simple refactorings, minor bug fixes',
            '- **5-16h**: Moderate features (1-2 days work), medium complexity',
            '- **17-40h**: Significant features (~1 week), notable complexity',
            '- **40h+**: Large-scale changes (multi-week), major features',
            '',
            '### 3. Test Coverage (1-10) - Secondary Opinion (12% weight)',
            '**Definition**: Quality and comprehensiveness of tests',
            '- **9-10**: Comprehensive tests, all edge cases, excellent coverage',
            '- **5-6**: Basic tests, main scenarios covered',
            '- **1-2**: Minimal or no tests',
            '',
            '### 4. Code Quality (1-10) - Tertiary Opinion (8.3% weight)',
            '**Definition**: Readability, maintainability, best practices',
            '- **9-10**: Excellent code, best practices, very maintainable',
            '- **5-6**: Acceptable code, some room for improvement',
            '- **1-2**: Poor code quality, hard to maintain',
            '',
            '### 5. Code Complexity (1-10, lower is better) - Tertiary Opinion (8.3% weight)',
            '**Definition**: Overall complexity of the implementation',
            '- **1-2**: Very simple, straightforward logic',
            '- **5-6**: Moderate complexity, understandable',
            '- **9-10**: Highly complex, difficult to understand',
            '',
            '### 6. Actual Time Hours - Tertiary Opinion (13.6% weight)',
            '**Definition**: Estimated actual time spent (from commit size/scope)',
            'Provide your best estimate based on the scope of changes.',
            '',
            '### 7. Technical Debt Hours - Tertiary Opinion (13% weight)',
            '**Definition**: Time to address technical debt introduced or removed',
            '- **Negative values**: Debt reduction (cleanup, refactoring)',
            '- **0**: Neutral impact',
            '- **Positive values**: Debt added',
            '',
            '## Output Requirements',
            '',
            '**You MUST return ONLY valid JSON** in the following format:',
            '',
            '{',
            '  "summary": "A conversational 2-3 sentence overview (speak as if in a meeting, e.g., \'Looking at this from a business perspective...\')",',
            '  "details": "Detailed conversational analysis. Use \\n for line breaks. Reference your PRIMARY expertise areas and acknowledge where you\'re providing secondary opinions.",',
            '  "metrics": {',
            '    "functionalImpact": <number 1-10>,',
            '    "idealTimeHours": <number in hours>,',
            '    "testCoverage": <number 1-10>,',
            '    "codeQuality": <number 1-10>,',
            '    "codeComplexity": <number 1-10>,',
            '    "actualTimeHours": <number in hours>,',
            '    "technicalDebtHours": <number in hours, can be negative>',
            '  }',
            '}',
            '',
            '## Important Notes',
            '- Speak conversationally, as if you\'re in a code review meeting',
            '- Reference other team members\' concerns when appropriate',
            '- Be confident in YOUR PRIMARY areas (functionalImpact, idealTimeHours)',
            '- Be humble about secondary areas: "From a business perspective, I\'d estimate test coverage around..."',
            '- ALL 7 metrics are required - provide your best assessment for each',
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

            // Ask business-focused questions (optimized for cost)
            const queries = [
                { q: 'What functional changes or user-facing features were modified?', topK: 3 },
                { q: 'Show API or interface changes', topK: 2 },
                { q: 'Show configuration or business rule changes', topK: 2 },
            ];

            const results = await rag.queryMultiple(queries);
            const ragContext = results.map(r => r.results).join('\n\n');

            return [
                '## Commit Analysis Request (RAG Mode - Large Diff)',
                '',
                `**Files Changed:** ${filesChanged}`,
                '',
                rag.getSummary(),
                '',
                '**Relevant Code for Business Analysis:**',
                ragContext,
                '',
                'Please provide your analysis scoring ALL 7 metrics based on the relevant code shown above:',
                '1. **Functional Impact** (1-10) - YOUR PRIMARY EXPERTISE',
                '2. **Ideal Time Hours** - YOUR PRIMARY EXPERTISE',
                '3. **Test Coverage** (1-10) - your secondary opinion',
                '4. **Code Quality** (1-10) - your tertiary opinion',
                '5. **Code Complexity** (1-10, lower is better) - your tertiary opinion',
                '6. **Actual Time Hours** - your tertiary estimate',
                '7. **Technical Debt Hours** - your tertiary assessment',
                '',
                'Focus on your expertise (business value, requirements) but provide scores for all pillars.',
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
                '## Business Analysis - Round 2: Raise Concerns & Questions',
                '',
                `**Files Changed:** ${filesChanged}`,
                '',
                '**Team Discussion (Round 1):**',
                teamContext,
                '',
                '**Your Task:**',
                '1. Review other agents\' metrics from Round 1',
                '2. Identify any scores that seem inconsistent with business requirements',
                '3. Raise specific concerns/questions to responsible agents:',
                '   - Test Coverage → QA Engineer',
                '   - Code Quality → Developer Reviewer',
                '   - Code Complexity/Tech Debt → Senior Architect',
                '   - Implementation Time → Developer Author',
                '4. Defend your Functional Impact and Ideal Time estimates if you anticipate questions',
                '',
                'Include your refined scores (can stay the same or adjust based on team context).',
            ].join('\n');
        }

        // Round 3 (Validation): Respond to concerns and finalize
        if (roundPurpose === 'validation' && context.agentResults && context.agentResults.length > 0) {
            const teamContext = context.agentResults
                .map(r => `**${r.agentName}:**\n${r.summary}\n\nMetrics: ${JSON.stringify(r.metrics, null, 2)}`)
                .join('\n\n---\n\n');

            return [
                '## Business Analysis - Round 3: Validation & Final Scores',
                '',
                `**Files Changed:** ${filesChanged}`,
                '',
                '**Team Discussion (Rounds 1-2):**',
                teamContext,
                '',
                '**Your Task:**',
                '1. Address any concerns raised about YOUR Functional Impact and Ideal Time scores',
                '2. Review responses from other agents about their metrics',
                '3. Adjust your secondary/tertiary scores if new evidence convinces you',
                '4. Provide FINAL refined scores for all 7 metrics',
                '',
                'This is the final round - be confident in your assessment.',
            ].join('\n');
        }

        // Fallback to full diff for small commits (no RAG needed)
        return [
            '## Commit Analysis Request',
            '',
            `**Files Changed:** ${filesChanged}`,
            '',
            '**Commit Diff:**',
            '```',
            context.commitDiff,
            '```',
            '',
            'Please provide your analysis scoring ALL 7 metrics:',
            '1. **Functional Impact** (1-10) - YOUR PRIMARY EXPERTISE',
            '2. **Ideal Time Hours** - YOUR PRIMARY EXPERTISE',
            '3. **Test Coverage** (1-10) - your secondary opinion',
            '4. **Code Quality** (1-10) - your tertiary opinion',
            '5. **Code Complexity** (1-10, lower is better) - your tertiary opinion',
            '6. **Actual Time Hours** - your tertiary estimate',
            '7. **Technical Debt Hours** - your tertiary assessment',
            '',
            'Focus on your expertise (business value, requirements) but provide scores for all pillars.',
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
                    console.warn(`Business Analyst: Invalid summary in LLM response`);
                    throw new Error('Missing or invalid summary field');
                }

                return {
                    summary: parsed.summary.trim(),
                    details: (parsed.details || '').trim(),
                    metrics: parsed.metrics || {
                        functionalImpact: 5,
                        idealTimeHours: 0,
                        testCoverage: 5,
                        codeQuality: 5,
                        codeComplexity: 5,
                        actualTimeHours: 0,
                        technicalDebtHours: 0,
                    },
                };
            } catch (error) {
                console.warn(`Business Analyst: Failed to parse LLM output: ${error instanceof Error ? error.message : String(error)}`);
                console.warn(`Business Analyst: Raw output (first 200 chars): ${output.substring(0, 200)}`);

                // fallback to string summary (if output is long enough)
                if (output.length > 10) {
                    return {
                        summary: output.substring(0, 500), // Truncate to reasonable length
                        details: '',
                        metrics: {
                            functionalImpact: 5,
                            idealTimeHours: 0,
                            testCoverage: 5,
                            codeQuality: 5,
                            codeComplexity: 5,
                            actualTimeHours: 0,
                            technicalDebtHours: 0,
                        },
                    };
                }

                // Return empty result if output is too short (will be filtered out)
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
        if (combined.includes('qa') || combined.includes('test')) return 'QA Engineer';
        if (combined.includes('architect')) return 'Senior Architect';
        if (combined.includes('author') || combined.includes('developer')) return 'Developer';
        if (combined.includes('reviewer')) return 'Code Reviewer';
        return 'Team Member';
    }
}

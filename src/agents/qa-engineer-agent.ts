
import { AppConfig } from '../config/config.interface';
import { BaseAgentWorkflow } from './base-agent-workflow';
import { AgentContext, AgentResult } from './agent.interface';

export class QAEngineerAgent extends BaseAgentWorkflow {
    private config: AppConfig;

    constructor(config: AppConfig) {
        super();
        this.config = config;
    }

    getMetadata() {
        return {
            name: 'qa-engineer',
            description: 'Evaluates test coverage, identifies testing gaps, and assesses quality assurance',
            role: 'QA Engineer',
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
        const previousContext = context.agentResults && context.agentResults.length > 0
            ? '\n\n## Team Discussion So Far\n\n' + context.agentResults.map((r: AgentResult, idx: number) => `**${this.detectAgentRole(r)}**: ${r.summary}`).join('\n\n')
            : '';

        // Round-specific instructions
        const roundInstructions = roundPurpose === 'initial'
            ? '## Round 1: Initial Analysis\nProvide your independent analysis of all 7 metrics based on the code changes.'
            : roundPurpose === 'concerns'
                ? '## Round 2: Raise Concerns & Questions\nReview other agents\' scores. If you have concerns about metrics outside your expertise (e.g., functional impact from BA, code quality from Reviewer, complexity from Architect), raise specific questions. Example: "Business Analyst: Your functional impact seems high - what specific user workflows are affected?" Also defend your test coverage score if challenged.'
                : '## Round 3: Validation & Final Scores\nRespond to any concerns raised about YOUR test coverage score. Validate or adjust your other metric scores based on responses from responsible agents. Provide final refined scores.';

        return [
            '# Role: QA Engineer',
            '',
            'You are a QA Engineer participating in a code review discussion.',
            'Your task is to evaluate the commit across ALL 7 pillars, with special focus on testing.',
            '',
            roundInstructions,
            '',
            '## Scoring Philosophy',
            'You will score ALL 7 metrics below. Your PRIMARY expertise (⭐) carries 40% weight in final calculation.',
            'Your secondary/tertiary opinions (9-17% weight) still contribute valuable perspectives.',
            '',
            '## Metrics to Score',
            '',
            '### ⭐ 1. Test Coverage (1-10) - YOUR PRIMARY EXPERTISE (40% weight)',
            '**Definition**: NEW test coverage added/updated for these changes (not existing test pass-through)',
            '- **9-10 (Excellent)**: Comprehensive NEW tests added, all scenarios covered, edge cases handled',
            '- **7-8 (Very Good)**: Good NEW test coverage, most important scenarios tested',
            '- **5-6 (Good)**: Basic NEW tests present, some scenarios covered',
            '- **3-4 (Average)**: Minimal NEW tests, critical scenarios missing',
            '- **1-2 (Poor)**: NO new tests added (even if existing tests pass)',
            '**⚠️ CRITICAL**: If no tests were added/modified in this diff, score is 1-2 (regardless of existing test suite)',
            '',
            '### 2. Functional Impact (1-10) - Tertiary Opinion (13% weight)',
            '**Definition**: How significantly this affects end users',
            '- **9-10**: Critical functional changes',
            '- **5-6**: Moderate functional impact',
            '- **1-2**: Minimal user-facing changes',
            '',
            '### 3. Ideal Time Hours - Tertiary Opinion (8.3% weight)',
            '**Definition**: How long this should optimally take',
            'Provide your estimate based on testing perspective.',
            '',
            '### 4. Code Quality (1-10) - Secondary Opinion (16.7% weight)',
            '**Definition**: Readability, maintainability from testing perspective',
            '- **9-10**: Very testable, clean interfaces',
            '- **5-6**: Moderately testable',
            '- **1-2**: Hard to test, poor interfaces',
            '',
            '### 5. Code Complexity (1-10, lower is better) - Tertiary Opinion (12.5% weight)',
            '**Definition**: Complexity that affects testability',
            '- **1-2**: Simple, easy to test',
            '- **5-6**: Moderate complexity',
            '- **9-10**: Very complex, hard to test',
            '',
            '### 6. Actual Time Hours - Tertiary Opinion (9.1% weight)',
            '**Definition**: Estimated actual time spent',
            'Provide your best estimate.',
            '',
            '### 7. Technical Debt Hours - Tertiary Opinion (13% weight)',
            '**Definition**: Test debt introduced or removed',
            '- **Negative**: Test debt reduction (added tests, improved coverage)',
            '- **0**: Neutral',
            '- **Positive**: Test debt added (missing tests)',
            '',
            '## Output Requirements',
            '',
            '**You MUST return ONLY valid JSON** in the following format:',
            '',
            '{',
            '  "summary": "A conversational 2-3 sentence overview (e.g., \'From a QA perspective...\')",',
            '  "details": "Detailed analysis. Reference your PRIMARY expertise in testing and acknowledge secondary opinions.",',
            '  "metrics": {',
            '    "testCoverage": <number 1-10>,',
            '    "functionalImpact": <number 1-10>,',
            '    "idealTimeHours": <number in hours>,',
            '    "codeQuality": <number 1-10>,',
            '    "codeComplexity": <number 1-10>,',
            '    "actualTimeHours": <number in hours>,',
            '    "technicalDebtHours": <number in hours, can be negative>',
            '  }',
            '}',
            '',
            '## Important Notes',
            '- Be confident in YOUR PRIMARY area (testCoverage)',
            '- Be humble about secondary areas: "From a testing perspective, code quality seems..."',
            '- ALL 7 metrics are required',
            '- Reference other team members when relevant',
            previousContext,
        ].join('\n');
    }

    private detectAgentRole(result: AgentResult): string {
        const combined = (result.summary || '').toLowerCase() + (result.details || '').toLowerCase();
        if (combined.includes('business') || combined.includes('functional')) return 'Business Analyst';
        if (combined.includes('architect')) return 'Senior Architect';
        if (combined.includes('author') || combined.includes('developer')) return 'Developer';
        if (combined.includes('reviewer')) return 'Code Reviewer';
        return 'Team Member';
    }

    protected async buildHumanPrompt(context: AgentContext): Promise<string> {
        const filesChanged = context.filesChanged?.join(', ') || 'unknown files';

        // Use RAG if available for large diffs (skip in subsequent rounds to save tokens)
        const isFirstRound = !context.agentResults || context.agentResults.length === 0;
        if (context.vectorStore && isFirstRound) {
            const { RAGHelper } = await import('../utils/rag-helper.js');
            const rag = new RAGHelper(context.vectorStore);

            // Ask targeted questions for QA analysis (optimized for cost)
            const queries = [
                { q: 'Show me all test file changes', topK: 3 },
                { q: 'What new test cases or assertions were added?', topK: 2 },
                { q: 'Show me business logic changes that need testing', topK: 2 },
            ];

            const results = await rag.queryMultiple(queries);
            const ragContext = results.map(r => r.results).join('\n\n');

            return [
                '## QA Review Request (RAG Mode - Large Diff)',
                '',
                `**Files Changed:** ${filesChanged}`,
                '',
                rag.getSummary(),
                '',
                '**Relevant Code for Testing Analysis:**',
                ragContext,
                '',
                'Please provide your analysis scoring ALL 7 metrics based on the relevant code shown above:',
                '1. **Test Coverage** (1-10) - YOUR PRIMARY EXPERTISE',
                '2. **Functional Impact** (1-10) - your tertiary opinion',
                '3. **Ideal Time Hours** - your tertiary estimate',
                '4. **Code Quality** (1-10) - your secondary opinion (testability perspective)',
                '5. **Code Complexity** (1-10, lower is better) - your tertiary opinion',
                '6. **Actual Time Hours** - your tertiary estimate',
                '7. **Technical Debt Hours** - your tertiary assessment (test debt)',
                '',
                'Focus on your expertise (testing, quality assurance) but provide scores for all pillars.',
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
                '## QA Review - Round 2: Raise Concerns & Questions',
                '',
                `**Files Changed:** ${filesChanged}`,
                '',
                '**Team Discussion (Round 1):**',
                teamContext,
                '',
                '**Your Task:**',
                '1. Review other agents\' metrics from Round 1',
                '2. Identify any scores that seem inconsistent with your testing analysis',
                '3. Raise specific concerns/questions to responsible agents:',
                '   - Functional Impact → Business Analyst',
                '   - Code Quality → Developer Reviewer',
                '   - Code Complexity/Tech Debt → Senior Architect',
                '   - Implementation Time → Developer Author',
                '4. Defend your Test Coverage score if you anticipate questions',
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
                '## QA Review - Round 3: Validation & Final Scores',
                '',
                `**Files Changed:** ${filesChanged}`,
                '',
                '**Team Discussion (Rounds 1-2):**',
                teamContext,
                '',
                '**Your Task:**',
                '1. Address any concerns raised about YOUR Test Coverage score',
                '2. Review responses from other agents about their metrics',
                '3. Adjust your secondary/tertiary scores if new evidence convinces you',
                '4. Provide FINAL refined scores for all 7 metrics',
                '',
                'This is the final round - be confident in your assessment.',
            ].join('\n');
        }

        // Fallback to full diff for small commits (no RAG needed)
        return [
            '## QA Review Request',
            '',
            `**Files Changed:** ${filesChanged}`,
            '',
            '**Commit Diff:**',
            '```',
            context.commitDiff,
            '```',
            '',
            'Please provide your analysis scoring ALL 7 metrics:',
            '1. **Test Coverage** (1-10) - YOUR PRIMARY EXPERTISE',
            '2. **Functional Impact** (1-10) - your tertiary opinion',
            '3. **Ideal Time Hours** - your tertiary estimate',
            '4. **Code Quality** (1-10) - your secondary opinion (testability perspective)',
            '5. **Code Complexity** (1-10, lower is better) - your tertiary opinion',
            '6. **Actual Time Hours** - your tertiary estimate',
            '7. **Technical Debt Hours** - your tertiary assessment (test debt)',
            '',
            'Focus on your expertise (testing, quality assurance) but provide scores for all pillars.',
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
                    console.warn(`QA Engineer: Invalid summary in LLM response`);
                    throw new Error('Missing or invalid summary field');
                }

                return {
                    summary: parsed.summary.trim(),
                    details: (parsed.details || '').trim(),
                    metrics: parsed.metrics || {
                        testCoverage: 5,
                        functionalImpact: 5,
                        idealTimeHours: 0,
                        codeQuality: 5,
                        codeComplexity: 5,
                        actualTimeHours: 0,
                        technicalDebtHours: 0,
                    },
                };
            } catch (error) {
                console.warn(`QA Engineer: Failed to parse LLM output: ${error instanceof Error ? error.message : String(error)}`);

                // fallback to string summary (if output is long enough)
                if (output.length > 10) {
                    return {
                        summary: output.substring(0, 500),
                        details: '',
                        metrics: {},
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
}

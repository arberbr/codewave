// src/agents/developer-reviewer-agent.ts
// Developer Reviewer Agent - Provides code review feedback and evaluates code quality

import { AppConfig } from '../config/config.interface';
import { BaseAgentWorkflow } from './base-agent-workflow';
import { AgentContext, AgentResult } from './agent.interface';

export class DeveloperReviewerAgent extends BaseAgentWorkflow {
    private config: AppConfig;

    constructor(config: AppConfig) {
        super();
        this.config = config;
    }

    getMetadata() {
        return {
            name: 'developer-reviewer',
            description: 'Reviews code quality, suggests improvements, and evaluates implementation details',
            role: 'Developer Reviewer',
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
            ? '## Round 1: Initial Analysis\nProvide your independent code review of all 7 metrics.'
            : roundPurpose === 'concerns'
                ? '## Round 2: Raise Concerns & Questions\nReview other agents\' scores. If you have concerns about code quality implications (e.g., test adequacy from QA, complexity from Architect, implementation approach from Author), raise specific questions. Defend your code quality assessment if challenged.'
                : '## Round 3: Validation & Final Scores\nRespond to concerns about YOUR code quality score. Validate or adjust other metrics based on agent responses. Provide final refined scores.';

        return [
            '# Role: Developer Reviewer',
            '',
            'You are a Developer Reviewer participating in a code review discussion.',
            'Your task is to evaluate the commit across ALL 7 pillars, with special focus on code quality.',
            '',
            roundInstructions,
            '',
            '## Scoring Philosophy',
            'You will score ALL 7 metrics below. Your PRIMARY expertise (⭐) carries 41.7% weight in final calculation.',
            'Your secondary opinions (17-21% weight) provide valuable review insights.',
            '',
            '## Metrics to Score',
            '',
            '### ⭐ 1. Code Quality (1-10) - YOUR PRIMARY EXPERTISE (41.7% weight)',
            '**Definition**: Overall code quality, readability, and maintainability',
            '- **9-10 (Excellent)**: Exemplary code, crystal-clear logic, perfect naming, idiomatic',
            '- **7-8 (Very Good)**: Clean, readable code with minor style inconsistencies',
            '- **5-6 (Good)**: Adequate quality, some readability issues, could be cleaner',
            '- **3-4 (Average)**: Poor readability, inconsistent style, confusing logic',
            '- **1-2 (Poor)**: Very poor quality, hard to understand, major issues',
            '',
            '### 2. Functional Impact (1-10) - Tertiary Opinion (13% weight)',
            '**Definition**: Reviewer perspective on functionality',
            '- **9-10**: Significant feature',
            '- **5-6**: Moderate change',
            '- **1-2**: Minor tweak',
            '',
            '### 3. Ideal Time Hours - Tertiary Opinion (12.5% weight)',
            '**Definition**: How long should this quality of code take?',
            'Provide estimate from code review perspective.',
            '',
            '### 4. Test Coverage (1-10) - Secondary Opinion (20% weight)',
            '**Definition**: Test quality from reviewer perspective',
            '- **9-10**: Excellent tests, thorough coverage',
            '- **5-6**: Adequate tests',
            '- **1-2**: Poor or missing tests',
            '',
            '### 5. Code Complexity (1-10, lower is better) - Secondary Opinion (20.8% weight)',
            '**Definition**: Complexity from readability perspective',
            '- **1-2**: Very simple, easy to review',
            '- **5-6**: Moderate complexity',
            '- **9-10**: Very complex, hard to review',
            '',
            '### 6. Actual Time Hours - Tertiary Opinion (13.6% weight)',
            '**Definition**: Time spent based on code scope',
            'Provide estimate from review perspective.',
            '',
            '### 7. Technical Debt Hours - Secondary Opinion (17.4% weight)',
            '**Definition**: Code debt from reviewer perspective',
            '- **Negative**: Improved code quality',
            '- **0**: Neutral',
            '- **Positive**: Quality shortcuts taken',
            '',
            '## Output Requirements',
            '',
            '**You MUST return ONLY valid JSON** in the following format:',
            '',
            '{',
            '  "summary": "A conversational 2-3 sentence overview (e.g., \'Looking at the code quality...\')",',
            '  "details": "Detailed code review with specific feedback. Reference your PRIMARY expertise in quality assessment.",',
            '  "metrics": {',
            '    "codeQuality": <number 1-10>,',
            '    "functionalImpact": <number 1-10>,',
            '    "idealTimeHours": <number in hours>,',
            '    "testCoverage": <number 1-10>,',
            '    "codeComplexity": <number 1-10>,',
            '    "actualTimeHours": <number in hours>,',
            '    "technicalDebtHours": <number in hours, can be negative>',
            '  }',
            '}',
            '',
            '## Important Notes',
            '- Be confident in YOUR PRIMARY area (codeQuality)',
            '- Be constructive: praise good code, suggest improvements',
            '- ALL 7 metrics are required',
            '- Reference other team members when relevant',
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

            // Ask code quality-focused questions (optimized for cost)
            const queries = [
                { q: 'Show code style and formatting changes', topK: 3 },
                { q: 'What code quality improvements or issues exist?', topK: 2 },
                { q: 'Show complex logic or algorithms that need review', topK: 2 },
            ];

            const results = await rag.queryMultiple(queries);
            const ragContext = results.map(r => r.results).join('\n\n');

            return [
                '## Code Review Request (RAG Mode - Large Diff)',
                '',
                `**Files Changed:** ${filesChanged}`,
                '',
                rag.getSummary(),
                '',
                '**Relevant Code for Quality Review:**',
                ragContext,
                '',
                'Please provide your code review scoring ALL 7 metrics based on the relevant code shown above:',
                '1. **Code Quality** (1-10) - YOUR PRIMARY EXPERTISE',
                '2. **Functional Impact** (1-10) - your tertiary opinion',
                '3. **Ideal Time Hours** - your tertiary estimate',
                '4. **Test Coverage** (1-10) - your secondary opinion',
                '5. **Code Complexity** (1-10, lower is better) - your secondary opinion',
                '6. **Actual Time Hours** - your tertiary estimate',
                '7. **Technical Debt Hours** - your secondary assessment (quality debt)',
                '',
                'Focus on your expertise (code quality, readability) but provide scores for all pillars.',
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
                '## Code Review - Round 2: Raise Concerns & Questions',
                '',
                `**Files Changed:** ${filesChanged}`,
                '',
                '**Team Discussion (Round 1):**',
                teamContext,
                '',
                '**Your Task:**',
                '1. Review other agents\' metrics - do they align with the code quality you observed?',
                '2. Raise concerns about quality implications:',
                '   - Test Coverage → QA Engineer (are tests actually adequate for this code?)',
                '   - Complexity → Senior Architect (is complexity assessment realistic?)',
                '   - Implementation Time → Developer Author (does time match quality?)',
                '3. Defend your Code Quality score if you anticipate questions',
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
                '## Code Review - Round 3: Validation & Final Scores',
                '',
                `**Files Changed:** ${filesChanged}`,
                '',
                '**Team Discussion (Rounds 1-2):**',
                teamContext,
                '',
                '**Your Task:**',
                '1. Address concerns about YOUR Code Quality score',
                '2. Review agent responses about complexity, tests, debt',
                '3. Adjust scores if convinced by new evidence',
                '4. Provide FINAL refined scores for all 7 metrics',
                '',
                'This is the final round - be confident in your assessment.',
            ].join('\n');
        }

        // Fallback to full diff for small commits (no RAG needed)
        return [
            '## Code Review Request',
            '',
            `**Files Changed:** ${filesChanged}`,
            '',
            '**Code to Review:**',
            '```',
            context.commitDiff,
            '```',
            '',
            'Please provide your code review scoring ALL 7 metrics:',
            '1. **Code Quality** (1-10) - YOUR PRIMARY EXPERTISE',
            '2. **Functional Impact** (1-10) - your tertiary opinion',
            '3. **Ideal Time Hours** - your tertiary estimate',
            '4. **Test Coverage** (1-10) - your secondary opinion',
            '5. **Code Complexity** (1-10, lower is better) - your secondary opinion',
            '6. **Actual Time Hours** - your tertiary estimate',
            '7. **Technical Debt Hours** - your secondary assessment (quality debt)',
            '',
            'Focus on your expertise (code quality, readability) but provide scores for all pillars.',
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
                    console.warn(`Developer Reviewer: Invalid summary in LLM response`);
                    throw new Error('Missing or invalid summary field');
                }

                return {
                    summary: parsed.summary.trim(),
                    details: (parsed.details || '').trim(),
                    metrics: parsed.metrics || {
                        codeQuality: 5,
                        functionalImpact: 5,
                        idealTimeHours: 0,
                        testCoverage: 5,
                        codeComplexity: 5,
                        actualTimeHours: 0,
                        technicalDebtHours: 0,
                    },
                };
            } catch (error) {
                console.warn(`Developer Reviewer: Failed to parse LLM output: ${error instanceof Error ? error.message : String(error)}`);

                // fallback to string summary (if output is long enough)
                if (output.length > 10) {
                    return {
                        summary: output.substring(0, 500),
                        details: '',
                        metrics: { codeQuality: 5 },
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
        if (combined.includes('architect')) return 'Senior Architect';
        return 'Team Member';
    }
}

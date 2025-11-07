/**
 * ANSI Progress Tracker for Parallel Commit Evaluation
 * Uses cli-progress MultiBar to display updating rows without duplication
 */

import { MultiBar, SingleBar, Presets } from 'cli-progress';

interface CommitProgress {
    hash: string;
    shortHash: string;
    author: string;
    date: string;
    status: 'pending' | 'vectorizing' | 'analyzing' | 'complete' | 'failed';
    progress: number; // 0-100
    currentStep: string;
    totalSteps?: number;
    currentStepIndex?: number;
    inputTokens?: number;
    outputTokens?: number;
    totalCost?: number;
}

interface BarPayload {
    commit: string;
    status: string;
}

export class ProgressTracker {
    private commits: Map<string, CommitProgress> = new Map();
    private isActive = false;
    private displayOrder: string[] = [];
    private multiBar: MultiBar | null = null;
    private bars: Map<string, SingleBar> = new Map();
    public originalConsoleLog?: (...args: any[]) => void;

    // Totals across all commits
    private totalInputTokens = 0;
    private totalOutputTokens = 0;
    private totalCost = 0;

    constructor() {
        // Initialize
    }

    /**
     * Helper to use original or current console.log
     */
    private log(...args: any[]) {
        if (this.originalConsoleLog) {
            this.originalConsoleLog(...args);
        } else {
            console.log(...args);
        }
    }

    /**
     * Initialize tracker with commits
     */
    initialize(commitHashes: Array<{ hash: string; shortHash: string; author: string; date: string }>) {
        this.displayOrder = commitHashes.map((c) => c.hash);

        // Print header
        this.log('\n\x1B[1m\x1B[36mParallel Commit Evaluation Progress:\x1B[0m');

        // Initialize multi-bar display
        this.multiBar = new MultiBar(
            {
                clearOnComplete: false,
                hideCursor: true,
                format: '{commit} | {bar} {percentage}% | {status}',
                barCompleteChar: '█',
                barIncompleteChar: '░',
                barsize: 25,
                fps: 5,
                stream: process.stderr,
            },
            Presets.shades_grey,
        );

        // Initialize all commits with pending status
        commitHashes.forEach((c) => {
            this.commits.set(c.hash, {
                hash: c.hash,
                shortHash: c.shortHash,
                author: c.author,
                date: c.date,
                status: 'pending',
                progress: 0,
                currentStep: 'Waiting...',
            });

            // Create progress bar for this commit
            const commitLabel = this.formatCommitLabel(c);
            const bar = this.multiBar!.create(100, 0, {
                commit: commitLabel,
                status: 'Pending',
            } as BarPayload);

            this.bars.set(c.hash, bar);
        });

        this.isActive = true;
    }

    /**
     * Format commit label for display
     */
    private formatCommitLabel(commit: { shortHash: string; author: string }): string {
        const shortHash = commit.shortHash.padEnd(9);
        const author = commit.author.substring(0, 16).padEnd(16);
        return `${shortHash} | ${author}`;
    }

    /**
     * Update progress for a specific commit
     */
    updateProgress(
        commitHash: string,
        update: {
            status?: CommitProgress['status'];
            progress?: number;
            currentStep?: string;
            totalSteps?: number;
            currentStepIndex?: number;
            inputTokens?: number;
            outputTokens?: number;
            totalCost?: number;
        },
    ) {
        const commit = this.commits.get(commitHash);
        if (!commit || !this.bars.has(commitHash)) return;

        if (update.status !== undefined) commit.status = update.status;
        if (update.progress !== undefined) commit.progress = update.progress;
        if (update.currentStep !== undefined) commit.currentStep = update.currentStep;
        if (update.totalSteps !== undefined) commit.totalSteps = update.totalSteps;
        if (update.currentStepIndex !== undefined) commit.currentStepIndex = update.currentStepIndex;

        // Update token and cost tracking
        if (update.inputTokens !== undefined) {
            const delta = update.inputTokens - (commit.inputTokens || 0);
            commit.inputTokens = update.inputTokens;
            this.totalInputTokens += delta;
        }
        if (update.outputTokens !== undefined) {
            const delta = update.outputTokens - (commit.outputTokens || 0);
            commit.outputTokens = update.outputTokens;
            this.totalOutputTokens += delta;
        }
        if (update.totalCost !== undefined) {
            const delta = update.totalCost - (commit.totalCost || 0);
            commit.totalCost = update.totalCost;
            this.totalCost += delta;
        }

        // Update progress bar
        const bar = this.bars.get(commitHash)!;
        const statusText = this.getStatusText(commit.status);
        const tokensInfo = `${(commit.inputTokens || 0).toLocaleString()}/${(commit.outputTokens || 0).toLocaleString()}`;
        const costInfo = `$${(commit.totalCost || 0).toFixed(4)}`;

        bar.update(commit.progress, {
            commit: this.formatCommitLabel({ shortHash: commit.shortHash, author: commit.author }),
            status: `${tokensInfo} | ${costInfo} | ${statusText}`,
        } as BarPayload);
    }

    /**
     * Get status text for display
     */
    private getStatusText(status: CommitProgress['status']): string {
        switch (status) {
            case 'pending':
                return 'Pending';
            case 'vectorizing':
                return 'Indexing...';
            case 'analyzing':
                return 'Analyzing...';
            case 'complete':
                return '✅ Complete';
            case 'failed':
                return '❌ Failed';
            default:
                return 'Unknown';
        }
    }

    /**
     * Finalize and show cursor again
     */
    finalize() {
        this.isActive = false;

        if (this.multiBar) {
            this.multiBar.stop();
        }

        // Add spacing
        this.log('');
        this.log('');
    }

    /**
     * Get summary of results
     */
    getSummary(): { total: number; complete: number; failed: number; pending: number } {
        let complete = 0;
        let failed = 0;
        let pending = 0;

        this.commits.forEach((commit) => {
            if (commit.status === 'complete') complete++;
            else if (commit.status === 'failed') failed++;
            else pending++;
        });

        return { total: this.commits.size, complete, failed, pending };
    }
}

/**
 * ANSI Progress Tracker for Parallel Commit Evaluation
 * Uses cli-progress MultiBar for reliable cross-platform progress display
 */

import * as cliProgress from 'cli-progress';

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
    row?: number; // Track which terminal row this commit is on
    inputTokens?: number; // Track input tokens used
    outputTokens?: number; // Track output tokens generated
    totalCost?: number; // Track total cost in USD
    progressBar?: cliProgress.SingleBar; // Individual progress bar
}

export class ProgressTracker {
    private commits: Map<string, CommitProgress> = new Map();
    private isActive = false;
    private displayOrder: string[] = []; // Maintain display order
    private multiBar: cliProgress.MultiBar | null = null;
    public originalConsoleLog?: (...args: any[]) => void; // Allow overriding console.log
    private lastUpdateTime: Map<string, number> = new Map(); // Track last update time per commit
    private UPDATE_THROTTLE_MS = 100; // Minimum ms between updates for same commit

    // Totals across all commits
    private totalInputTokens = 0;
    private totalOutputTokens = 0;
    private totalCost = 0;

    constructor() {
        // Create MultiBar container for multiple progress bars
        this.multiBar = new cliProgress.MultiBar({
            clearOnComplete: false,
            hideCursor: true,
            format: '{commit} | {author} | {tokens} | {cost} | {bar} {percentage}% | {status}',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            barsize: 20,
            stopOnComplete: true,
            forceRedraw: false, // Prevent excessive redraws
        }, cliProgress.Presets.shades_classic);
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

        this.log('\n\x1B[1m\x1B[36mParallel Commit Evaluation Progress:\x1B[0m');
        this.log('─'.repeat(105));
        this.log(`${'Commit'.padEnd(9)} | ${'Author'.padEnd(16)} | ${'Tokens (In/Out)'.padEnd(18)} | ${'Cost'.padEnd(10)} | ${'Progress'.padEnd(30)} | ${'Status'.padEnd(12)}`);
        this.log('─'.repeat(105));

        commitHashes.forEach((c) => {
            // Create progress bar for this commit
            const bar = this.multiBar!.create(100, 0, {
                commit: c.shortHash.padEnd(9),
                author: c.author.substring(0, 16).padEnd(16),
                tokens: '0/0'.padEnd(18),
                cost: '$0.0000'.padEnd(10),
                status: 'Pending'.padEnd(12),
            });

            this.commits.set(c.hash, {
                hash: c.hash,
                shortHash: c.shortHash,
                author: c.author,
                date: c.date,
                status: 'pending',
                progress: 0,
                currentStep: 'Waiting...',
                progressBar: bar,
            });
        });

        this.isActive = true;
    }    /**
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
        if (!commit) return;

        // Throttle rapid updates (except for completion)
        const now = Date.now();
        const lastUpdate = this.lastUpdateTime.get(commitHash) || 0;
        const isComplete = update.status === 'complete' || update.progress === 100;

        if (!isComplete && now - lastUpdate < this.UPDATE_THROTTLE_MS) {
            return; // Skip this update, too soon
        }
        this.lastUpdateTime.set(commitHash, now);

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

        // Update the progress bar
        if (commit.progressBar) {
            const statusText = this.getStatusText(commit.status);
            const inputTokens = (commit.inputTokens || 0).toLocaleString();
            const outputTokens = (commit.outputTokens || 0).toLocaleString();
            const tokensText = `${inputTokens}/${outputTokens}`.padEnd(18);
            const costText = `$${(commit.totalCost || 0).toFixed(4)}`.padEnd(10);

            commit.progressBar.update(commit.progress, {
                commit: commit.shortHash.padEnd(9),
                author: commit.author.substring(0, 16).padEnd(16),
                tokens: tokensText,
                cost: costText,
                status: statusText.padEnd(12),
            });
        }
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

        // Stop the multi-bar
        if (this.multiBar) {
            this.multiBar.stop();
        }

        // Just add a newline for spacing - detailed results shown elsewhere
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

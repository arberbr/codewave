import { DiffVectorStoreService } from '../services/diff-vector-store.service';

/**
 * RAG Query Helper for Agents
 * 
 * Provides convenient methods for agents to query the vector store
 * with targeted questions about the commit diff.
 */
export class RAGHelper {
    constructor(private readonly vectorStore: DiffVectorStoreService) { }

    /**
     * Query the vector store and return formatted results
     * @param query Natural language question about the commit
     * @param topK Number of results to return (default: 3)
     * @returns Formatted context string with relevant code chunks
     */
    async query(query: string, topK: number = 3): Promise<string> {
        const { chunks, summary } = await this.vectorStore.query(query, { topK });

        if (chunks.length === 0) {
            return `No relevant code found for query: "${query}"`;
        }

        // Format results as markdown (optimized - reduced chunk size)
        const formattedChunks = chunks.map((chunk, idx) => {
            const { file, hunkStartLine, addedLines, deletedLines, changeType } = chunk.metadata;
            const relevancePercent = (chunk.score * 100).toFixed(1);

            return [
                `### Result ${idx + 1}: ${file} (${relevancePercent}% relevance)`,
                `- **Location**: Lines starting at ${hunkStartLine}`,
                `- **Changes**: +${addedLines}/-${deletedLines} lines`,
                `- **Type**: ${changeType}`,
                ``,
                '```diff',
                chunk.content.split('\n').slice(0, 5).join('\n'), // Limit to 5 lines per chunk (reduced from 10)
                chunk.content.split('\n').length > 5 ? '... (truncated for brevity)' : '',
                '```',
                '',
            ].join('\n');
        });

        return [
            `## ${summary}`,
            ``,
            ...formattedChunks,
        ].join('\n');
    }

    /**
     * Run multiple queries and aggregate results
     * Useful for cross-pillar validation where agents ask multiple questions
     */
    async queryMultiple(queries: Array<{ q: string; topK?: number }>): Promise<Array<{
        query: string;
        results: string;
        relevantFiles: Set<string>;
    }>> {
        const queryResults = await Promise.all(
            queries.map(async ({ q, topK = 3 }) => {
                const { chunks } = await this.vectorStore.query(q, { topK });
                const relevantFiles = new Set(chunks.map(c => c.metadata.file as string));
                const formattedResults = await this.query(q, topK);

                return {
                    query: q,
                    results: formattedResults,
                    relevantFiles,
                };
            }),
        );

        return queryResults;
    }

    /**
     * Get a summary of the diff for context
     */
    getSummary(): string {
        const stats = this.vectorStore.getStats();
        return [
            `**Diff Summary**:`,
            `- Files changed: ${stats.filesChanged}`,
            `- Additions: +${stats.additions}`,
            `- Deletions: -${stats.deletions}`,
            `- Total chunks indexed: ${stats.documentCount}`,
        ].join('\n');
    }

    /**
     * Check if RAG is available (vector store initialized)
     */
    static isAvailable(context: { vectorStore?: DiffVectorStoreService }): boolean {
        return context.vectorStore !== undefined;
    }
}

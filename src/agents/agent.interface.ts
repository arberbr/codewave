export interface Agent {
    getMetadata(): AgentMetadata;
    canExecute(context: AgentContext): Promise<boolean>;
    estimateTokens(context: AgentContext): Promise<number>;
    execute(context: AgentContext, options?: AgentExecutionOptions): Promise<AgentResult>;
}

export interface AgentMetadata {
    name: string;
    description: string;
    role: string;
}

export interface AgentContext {
    commitDiff: string;
    filesChanged: string[];
    agentResults?: AgentResult[]; // Previous agent responses for conversation
    conversationHistory?: import('../types/agent.types').ConversationMessage[]; // Full conversation log
    vectorStore?: import('../services/diff-vector-store.service').DiffVectorStoreService; // RAG support for large diffs
    roundPurpose?: 'initial' | 'concerns' | 'validation'; // Current discussion phase

    // Batch evaluation metadata (for progress logging)
    commitHash?: string;
    commitIndex?: number;
    totalCommits?: number;

    [key: string]: any;
}

export interface AgentExecutionOptions {
    [key: string]: any;
}

export interface AgentResult {
    summary: string;
    details?: string;
    metrics?: Record<string, any>;
    agentName?: string; // Agent identifier (set by orchestrator)
    agentRole?: string; // Agent role/description (set by orchestrator)
    tokenUsage?: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
}

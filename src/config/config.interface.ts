// src/config/config.interface.ts
// Commit Evaluator AppConfig interface (matches architecture-doc-generator pattern)

export interface AppConfig {
    apiKeys: {
        anthropic: string;
        openai: string;
        google: string;
        xai: string;
    };
    llm: {
        provider: 'anthropic' | 'openai' | 'google' | 'xai';
        model: string;
        temperature: number;
        maxTokens: number;
    };
    agents: {
        enabled: string[];
        retries: number; // Discussion rounds
        timeout: number;
        clarityThreshold?: number; // Stop early if convergence detected (0-1)
    };
    output: {
        directory: string;
        format: 'json' | 'markdown' | 'html';
        generateHtml: boolean;
    };
    tracing: {
        enabled: boolean;
        apiKey: string;
        project: string;
        endpoint: string;
    };
}

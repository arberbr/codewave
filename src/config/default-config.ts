// src/config/default-config.ts
// Default configuration matching architecture-doc-generator pattern

import { AppConfig } from './config.interface';

export const DEFAULT_CONFIG: AppConfig = {
    apiKeys: {
        anthropic: '',
        openai: '',
        google: '',
        xai: '',
    },
    llm: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-5-20250929',
        temperature: 0.2,
        maxTokens: 8000, // Increased for longer, more detailed responses
    },
    agents: {
        enabled: ['senior-reviewer', 'developer', 'qa-engineer', 'metrics'],
        retries: 2, // Number of discussion rounds
        timeout: 300000, // 5 minutes per agent
        clarityThreshold: 0.85, // Stop early if 85% similarity between rounds
    },
    output: {
        directory: '.', // Current directory
        format: 'json',
        generateHtml: true, // Also generate report.html and index.html
    },
    tracing: {
        enabled: false,
        apiKey: '',
        project: 'commit-evaluator',
        endpoint: 'https://api.smith.langchain.com',
    },
};

// For backwards compatibility
export const defaultConfig = DEFAULT_CONFIG;

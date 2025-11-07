// src/config/config-loader.ts
// Loads config from .commit-evaluator.config.json - never prompts, requires config file

import fs from 'fs';
import path from 'path';
import { DEFAULT_CONFIG } from './default-config';
import { AppConfig } from './config.interface';

/**
 * Load configuration from file
 * @param configPath Optional path to config file (defaults to .commit-evaluator.config.json in cwd)
 * @returns Merged configuration (file + defaults)
 */
export function loadConfig(configPath?: string): AppConfig | null {
    const resolvedPath = configPath || path.resolve(process.cwd(), '.commit-evaluator.config.json');

    // Check if config file exists
    if (!fs.existsSync(resolvedPath)) {
        return null; // Config not found - caller should handle
    }

    try {
        const fileContent = fs.readFileSync(resolvedPath, 'utf-8');
        const userConfig: Partial<AppConfig> = JSON.parse(fileContent);

        // Deep merge with defaults
        const merged: AppConfig = {
            apiKeys: { ...DEFAULT_CONFIG.apiKeys, ...(userConfig.apiKeys || {}) },
            llm: { ...DEFAULT_CONFIG.llm, ...(userConfig.llm || {}) },
            agents: { ...DEFAULT_CONFIG.agents, ...(userConfig.agents || {}) },
            output: { ...DEFAULT_CONFIG.output, ...(userConfig.output || {}) },
            tracing: { ...DEFAULT_CONFIG.tracing, ...(userConfig.tracing || {}) },
        };

        return merged;
    } catch (err) {
        throw new Error(`Failed to parse config file at ${resolvedPath}: ${err instanceof Error ? err.message : String(err)}`);
    }
}

/**
 * Check if config file exists
 */
export function configExists(configPath?: string): boolean {
    const resolvedPath = configPath || path.resolve(process.cwd(), '.commit-evaluator.config.json');
    return fs.existsSync(resolvedPath);
}

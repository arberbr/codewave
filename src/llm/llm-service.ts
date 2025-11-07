import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { AppConfig } from '../config/config.interface';

export class LLMService {
    /**
     * Returns a chat model instance based on AppConfig
     * Extracts provider, model, API key from config object
     * @param config Full AppConfig object
     */
    static getChatModel(config: AppConfig) {
        const provider = config.llm.provider;
        const model = config.llm.model;
        const temperature = config.llm.temperature ?? 0.2;
        const maxTokens = config.llm.maxTokens ?? 4096;

        // Get API key for selected provider
        const apiKey = config.apiKeys[provider];

        if (!apiKey) {
            throw new Error(
                `Missing API key for provider: ${provider}. Run: commit-evaluator config --set apiKeys.${provider}=<your-key>`,
            );
        }

        switch (provider) {
            case 'anthropic':
                return new ChatAnthropic({
                    anthropicApiKey: apiKey,
                    temperature,
                    maxTokens,
                    modelName: model,
                });

            case 'openai':
                return new ChatOpenAI({
                    openAIApiKey: apiKey,
                    temperature,
                    maxTokens,
                    modelName: model,
                });

            case 'google':
                return new ChatGoogleGenerativeAI({
                    apiKey,
                    temperature,
                    maxOutputTokens: maxTokens,
                    model,
                });

            case 'xai':
                // xAI Grok uses OpenAI-compatible API
                return new ChatOpenAI({
                    openAIApiKey: apiKey,
                    temperature,
                    maxTokens,
                    modelName: model,
                    configuration: {
                        baseURL: 'https://api.x.ai/v1',
                    },
                });

            default:
                throw new Error(`Unsupported LLM provider: ${provider}`);
        }
    }
}

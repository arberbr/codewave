
import { Agent, AgentContext, AgentExecutionOptions, AgentResult } from './agent.interface';
import { RunnableSequence, RunnableLambda } from "@langchain/core/runnables";
import { LLMService } from "../llm/llm-service";

export abstract class BaseAgentWorkflow implements Agent {
    abstract getMetadata(): any;
    abstract canExecute(context: AgentContext): Promise<boolean>;
    abstract estimateTokens(context: AgentContext): Promise<number>;

    async execute(context: AgentContext, options?: AgentExecutionOptions): Promise<AgentResult> {
        // Example LCEL workflow: system prompt -> LLM -> parse -> return
        // Expect config to be present in this.config (injected via constructor)
        const config = (this as any).config;
        if (!config) {
            throw new Error('Missing config in agent. Ensure config is passed to agent constructor.');
        }

        // Track token usage
        let tokenUsage = {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
        };

        // Get chat model from config (LLMService extracts API key from config.apiKeys[provider])
        const model = LLMService.getChatModel(config);

        const workflow = RunnableSequence.from([
            RunnableLambda.from(async (input: AgentContext) => {
                const systemPrompt = this.buildSystemPrompt(input);
                const humanPrompt = await Promise.resolve(this.buildHumanPrompt(input)); // Support both sync and async
                return [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: humanPrompt }
                ];
            }),
            (model as any).bind ? (model as any).bind({}) : model,
            RunnableLambda.from(async (output: any) => {
                // Extract token usage from LLM response
                // Support both Anthropic (input_tokens/output_tokens) and OpenAI (prompt_tokens/completion_tokens)
                if (output?.response_metadata?.usage) {
                    const usage = output.response_metadata.usage;
                    tokenUsage = {
                        inputTokens: usage.input_tokens || usage.prompt_tokens || 0,
                        outputTokens: usage.output_tokens || usage.completion_tokens || 0,
                        totalTokens: usage.total_tokens || (usage.input_tokens || usage.prompt_tokens || 0) + (usage.output_tokens || usage.completion_tokens || 0),
                    };
                } else if (output?.usage) {
                    // Fallback: Check top-level usage field (some LLM providers)
                    const usage = output.usage;
                    tokenUsage = {
                        inputTokens: usage.input_tokens || usage.prompt_tokens || 0,
                        outputTokens: usage.output_tokens || usage.completion_tokens || 0,
                        totalTokens: usage.total_tokens || (usage.input_tokens || usage.prompt_tokens || 0) + (usage.output_tokens || usage.completion_tokens || 0),
                    };
                }

                // Extract .content from AIMessage object
                const content = output?.content || output;
                return this.parseLLMResult(content);
            })
        ]);

        const result = await workflow.invoke(context);

        // Add token usage to result
        result.tokenUsage = tokenUsage;

        return result;
    }

    protected buildSystemPrompt(context: AgentContext): string {
        return `You are the ${this.getMetadata().role} agent. Analyze the commit diff.`;
    }

    protected buildHumanPrompt(context: AgentContext): string | Promise<string> {
        return context.commitDiff;
    }

    protected parseLLMResult(output: any): AgentResult {
        // Default: return as summary
        return {
            summary: typeof output === 'string' ? output : JSON.stringify(output),
            details: '',
            metrics: {},
        };
    }
}

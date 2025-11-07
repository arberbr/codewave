export interface EvaluationOutput {
    agent: string;
    summary: string;
    details?: string;
    metrics?: Record<string, any>;
}

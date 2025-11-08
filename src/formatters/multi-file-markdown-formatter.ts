import { AgentResult } from '../agents/agent.interface';

export class MultiFileMarkdownFormatter {
  static format(results: AgentResult[]): string {
    return results.map((r) => `# ${r.summary}\n${r.details || ''}`).join('\n\n');
  }
}

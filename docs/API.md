# CodeWave API Reference

Comprehensive API documentation for programmatic usage of CodeWave.

## Table of Contents

1. [Core Classes](#core-classes)
2. [Agent Interface](#agent-interface)
3. [Type Definitions](#type-definitions)
4. [Services](#services)
5. [Usage Examples](#usage-examples)

---

## Core Classes

### `CodeWaveEvaluator`

Main class for evaluating commits programmatically.

#### Constructor

```typescript
new CodeWaveEvaluator(config: EvaluatorConfig)
```

**Parameters:**

```typescript
interface EvaluatorConfig {
  // LLM Configuration
  llmProvider: 'anthropic' | 'openai' | 'google';
  model: string;
  apiKey: string;
  apiBaseUrl?: string;

  // Evaluation Configuration
  maxTokensPerRequest?: number; // default: 4000
  enableRag?: boolean; // default: true
  ragChunkSize?: number; // default: 2000
  ragThreshold?: number; // default: 102400 (100KB)

  // Output Configuration
  outputDirectory?: string; // default: '.evaluated-commits'
  reportFormat?: 'html' | 'json' | 'markdown' | 'all'; // default: 'all'

  // Logging
  verbose?: boolean; // default: false
}
```

**Example:**

```typescript
import { CodeWaveEvaluator } from 'codewave';

const evaluator = new CodeWaveEvaluator({
  llmProvider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  apiKey: process.env.ANTHROPIC_API_KEY,
  enableRag: true,
  verbose: true,
});
```

#### Methods

##### `evaluate(commitHash: string, options?: EvaluationOptions): Promise<EvaluationResult>`

Evaluate a single commit.

**Parameters:**

- `commitHash` (string): Git commit hash, reference, or branch name
- `options` (optional):
  ```typescript
  interface EvaluationOptions {
    repoPath?: string; // Git repository path (default: current dir)
    outputDir?: string; // Override config output directory
    skipReport?: boolean; // Skip HTML report generation
    verbose?: boolean; // Override verbose setting
  }
  ```

**Returns:** `Promise<EvaluationResult>`

**Example:**

```typescript
const result = await evaluator.evaluate('HEAD', {
  repoPath: '/path/to/repo',
  verbose: true,
});

console.log(`Code Quality: ${result.metrics.codeQuality}/10`);
console.log(`Test Coverage: ${result.metrics.testCoverage}/10`);
```

##### `evaluateBatch(options: BatchEvaluationOptions): Promise<BatchEvaluationResult>`

Evaluate multiple commits with progress tracking.

**Parameters:**

```typescript
interface BatchEvaluationOptions {
  count?: number; // Number of commits (default: 10)
  since?: string; // Start date (ISO or natural language)
  until?: string; // End date (ISO or natural language)
  branch?: string; // Branch to evaluate (default: current)
  repoPath?: string; // Git repository path
  outputDir?: string; // Override config output directory
  parallel?: number; // Parallel evaluations (default: 3, max: 5)
  skipErrors?: boolean; // Continue on errors (default: false)
  onProgress?: (update: ProgressUpdate) => void; // Progress callback
}
```

**Returns:** `Promise<BatchEvaluationResult>`

**Example:**

```typescript
const batchResult = await evaluator.evaluateBatch({
  count: 50,
  branch: 'develop',
  parallel: 5,
  onProgress: (update) => {
    console.log(`Progress: ${update.current}/${update.total} (${update.percent}%)`);
    console.log(`Average time: ${update.averageTime}s per commit`);
  },
});

console.log(`Evaluated: ${batchResult.successful}/${batchResult.total}`);
console.log(`Average quality: ${batchResult.averageQuality}/10`);
```

---

## Agent Interface

All agents implement the `Agent` interface and extend `BaseAgentWorkflow`.

### Agent Structure

```typescript
interface Agent {
  name: string;
  emoji: string;
  role: string;
  metrics: string[];

  assessCommit(context: AgentContext): Promise<AgentResponse>;
  raiseConcerns(context: AgentContext): Promise<AgentResponse>;
  validateAndAgree(context: AgentContext): Promise<AgentResponse>;
}
```

### Available Agents

#### 1. Business Analyst (🎯)

```typescript
import { BusinessAnalystAgent } from 'codewave';

const analyst = new BusinessAnalystAgent(llmService);

const response = await analyst.assessCommit({
  commit: commitData,
  conversationHistory: [],
});
```

**Evaluates:**

- Functional Impact (1-10)
- Ideal Time Hours

#### 2. Developer Author (👨‍💻)

```typescript
import { DeveloperAuthorAgent } from 'codewave';

const author = new DeveloperAuthorAgent(llmService);
```

**Evaluates:**

- Actual Time Hours

#### 3. Developer Reviewer (🔍)

```typescript
import { DeveloperReviewerAgent } from 'codewave';

const reviewer = new DeveloperReviewerAgent(llmService);
```

**Evaluates:**

- Code Quality (1-10)

#### 4. Senior Architect (🏛️)

```typescript
import { SeniorArchitectAgent } from 'codewave';

const architect = new SeniorArchitectAgent(llmService);
```

**Evaluates:**

- Code Complexity (10-1, inverted)
- Technical Debt Hours (+/-)

#### 5. QA Engineer (🧪)

```typescript
import { QAEngineerAgent } from 'codewave';

const qaEngineer = new QAEngineerAgent(llmService);
```

**Evaluates:**

- Test Coverage (1-10)

---

## Type Definitions

### EvaluationResult

```typescript
interface EvaluationResult {
  commitHash: string;
  commitMetadata: CommitMetadata;

  // Round-by-round metrics
  rounds: EvaluationRound[];

  // Final consensus metrics
  metrics: EvaluationMetrics;
  consensus: ConsensusData;

  // Conversation history
  conversation: ConversationTurn[];

  // Output files
  outputFiles: OutputFiles;

  // Processing metadata
  metadata: {
    startTime: Date;
    endTime: Date;
    duration: number; // milliseconds
    tokensUsed: number;
    estimatedCost: number;
    model: string;
    provider: string;
  };
}
```

### EvaluationMetrics

```typescript
interface EvaluationMetrics {
  codeQuality: number; // 1-10 (Developer Reviewer)
  codeComplexity: number; // 10-1 inverted (Senior Architect)
  idealTimeHours: number; // Hours (Business Analyst)
  actualTimeHours: number; // Hours (Developer Author)
  technicalDebtHours: number; // +/- Hours (Senior Architect)
  functionalImpact: number; // 1-10 (Business Analyst)
  testCoverage: number; // 1-10 (QA Engineer)

  // Derived metrics
  productivityRatio: number; // actual / ideal
  qualityScore: number; // Weighted composite
  overallScore: number; // Final consensus score
}
```

### EvaluationRound

```typescript
interface EvaluationRound {
  roundNumber: 1 | 2 | 3;
  roundName: 'Initial Assessment' | 'Concerns' | 'Validation & Agreement';
  agentResponses: AgentResponse[];
  timestamp: Date;
  metricsSnapshot: Partial<EvaluationMetrics>;
}
```

### AgentResponse

```typescript
interface AgentResponse {
  agentName: string;
  emoji: string;
  response: string;
  metrics: Record<string, number>;
  concerns?: string[];
  confidence: number; // 0-100
  reasoning: string;
}
```

### CommitMetadata

```typescript
interface CommitMetadata {
  hash: string;
  shortHash: string;
  author: {
    name: string;
    email: string;
  };
  committer: {
    name: string;
    email: string;
  };
  message: string;
  date: Date;
  filesChanged: number;
  insertions: number;
  deletions: number;
  diffSize: number;
  isLargeDiff: boolean;
}
```

### ConsensusData

```typescript
interface ConsensusData {
  agreeOnQuality: boolean;
  agreeOnComplexity: boolean;
  agreeOnTestCoverage: boolean;
  topConcerns: string[];
  recommendations: string[];
  majorThemes: string[];
  confidenceLevel: 'high' | 'medium' | 'low';
}
```

### OutputFiles

```typescript
interface OutputFiles {
  htmlReport?: string; // Path to HTML report
  jsonResults?: string; // Path to JSON results
  markdownTranscript?: string; // Path to markdown transcript
  diffFile?: string; // Path to original diff
  summaryFile?: string; // Path to text summary
  directory: string; // Output directory
}
```

---

## Services

### LLMService

Interface for LLM providers.

```typescript
interface LLMService {
  generateMessage(
    systemPrompt: string,
    userMessage: string,
    options?: GenerateOptions
  ): Promise<string>;

  countTokens(text: string): Promise<number>;

  estimateCost(tokensUsed: number, model: string): Promise<number>;
}
```

### CommitService

Git commit operations.

```typescript
interface CommitService {
  getCommit(hash: string, repoPath?: string): Promise<CommitData>;
  getCommitRange(
    since: string,
    until: string,
    branch?: string,
    repoPath?: string
  ): Promise<CommitData[]>;
  getDiff(hash: string, repoPath?: string): Promise<string>;
}
```

### VectorStoreService

RAG support for large diffs.

```typescript
interface VectorStoreService {
  addDocuments(texts: string[], metadata: Record<string, any>): Promise<void>;
  similaritySearch(query: string, k: number): Promise<string[]>;
  clear(): Promise<void>;
}
```

---

## Usage Examples

### Example 1: Single Commit Evaluation

```typescript
import { CodeWaveEvaluator } from 'codewave';

async function evaluateSingleCommit() {
  const evaluator = new CodeWaveEvaluator({
    llmProvider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    const result = await evaluator.evaluate('HEAD');

    console.log('=== Evaluation Results ===');
    console.log(`Code Quality: ${result.metrics.codeQuality}/10`);
    console.log(`Complexity: ${result.metrics.codeComplexity}/10`);
    console.log(`Test Coverage: ${result.metrics.testCoverage}/10`);
    console.log(`Quality Score: ${result.metrics.qualityScore}/10`);
    console.log(`\nTop Concerns:`);
    result.consensus.topConcerns.forEach((concern) => {
      console.log(`  • ${concern}`);
    });
    console.log(`\nRecommendations:`);
    result.consensus.recommendations.forEach((rec) => {
      console.log(`  • ${rec}`);
    });
  } catch (error) {
    console.error('Evaluation failed:', error);
  }
}

evaluateSingleCommit();
```

### Example 2: Batch Evaluation with Progress

```typescript
import { CodeWaveEvaluator } from 'codewave';

async function batchEvaluation() {
  const evaluator = new CodeWaveEvaluator({
    llmProvider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    const result = await evaluator.evaluateBatch({
      count: 100,
      branch: 'main',
      parallel: 5,
      onProgress: (update) => {
        console.log(`Progress: ${update.current}/${update.total} (${update.percent}%)`);
        console.log(`Speed: ${update.averageTime}s/commit | ETA: ${update.eta}s`);
        console.log(`Tokens: ${update.tokensUsed} | Cost: $${update.estimatedCost}`);
      },
    });

    console.log('\n=== Batch Summary ===');
    console.log(`Total: ${result.total}`);
    console.log(`Successful: ${result.successful}`);
    console.log(`Failed: ${result.failed}`);
    console.log(`Average Quality: ${result.averageQuality.toFixed(2)}/10`);
    console.log(`Average Coverage: ${result.averageCoverage.toFixed(2)}/10`);
    console.log(`Total Cost: $${result.totalCost.toFixed(2)}`);

    if (result.errors.length > 0) {
      console.log('\n=== Errors ===');
      result.errors.forEach((err) => {
        console.log(`  [${err.commitHash}] ${err.message}`);
      });
    }
  } catch (error) {
    console.error('Batch evaluation failed:', error);
  }
}

batchEvaluation();
```

### Example 3: Custom Agent Workflow

```typescript
import { CodeWaveEvaluator, DeveloperReviewerAgent, QAEngineerAgent } from 'codewave';

async function customWorkflow() {
  const evaluator = new CodeWaveEvaluator({
    llmProvider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Focus on specific agents
  const result = await evaluator.evaluate('HEAD', {
    agents: ['DeveloperReviewer', 'QAEngineer'], // Only these agents
  });

  console.log('Quality Focus:');
  console.log(`  Code Quality: ${result.metrics.codeQuality}/10`);
  console.log(`  Test Coverage: ${result.metrics.testCoverage}/10`);
}

customWorkflow();
```

### Example 4: CI/CD Integration

```typescript
import { CodeWaveEvaluator } from 'codewave';

async function cicdQualityGate() {
  const evaluator = new CodeWaveEvaluator({
    llmProvider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    apiKey: process.env.ANTHROPIC_API_KEY,
    outputDirectory: './ci-reports',
  });

  const result = await evaluator.evaluate(process.env.CI_COMMIT_SHA);

  // Quality gates
  const qualityThreshold = 7.0;
  const coverageThreshold = 8.0;

  let failed = false;

  if (result.metrics.codeQuality < qualityThreshold) {
    console.error(
      `❌ Code Quality ${result.metrics.codeQuality}/10 below threshold ${qualityThreshold}`
    );
    failed = true;
  }

  if (result.metrics.testCoverage < coverageThreshold) {
    console.error(
      `❌ Test Coverage ${result.metrics.testCoverage}/10 below threshold ${coverageThreshold}`
    );
    failed = true;
  }

  if (result.metrics.technicalDebtHours > 10) {
    console.error(`❌ Technical Debt ${result.metrics.technicalDebtHours}h exceeds limit 10h`);
    failed = true;
  }

  if (failed) {
    console.log('\nFull Report:', result.outputFiles.htmlReport);
    process.exit(1);
  }

  console.log('✅ All quality gates passed!');
  process.exit(0);
}

cicdQualityGate();
```

### Example 5: Analyzing Results

```typescript
import { CodeWaveEvaluator } from 'codewave';
import * as fs from 'fs';

async function analyzeResults() {
  const evaluator = new CodeWaveEvaluator({
    llmProvider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const result = await evaluator.evaluate('HEAD');

  // Save results as JSON
  fs.writeFileSync('evaluation-results.json', JSON.stringify(result, null, 2));

  // Analyze conversation
  console.log('=== Conversation Analysis ===');
  result.rounds.forEach((round) => {
    console.log(`\n--- Round ${round.roundNumber}: ${round.roundName} ---`);
    round.agentResponses.forEach((response) => {
      console.log(`${response.emoji} ${response.agentName}`);
      console.log(`   Confidence: ${response.confidence}%`);
      console.log(`   Reasoning: ${response.reasoning.substring(0, 100)}...`);
    });
  });

  // Export conversation to markdown
  const markdown = formatConversation(result);
  fs.writeFileSync('conversation.md', markdown);
}

function formatConversation(result: EvaluationResult): string {
  let md = `# CodeWave Evaluation Report\n\n`;
  md += `**Commit**: ${result.commitHash}\n`;
  md += `**Author**: ${result.commitMetadata.author.name}\n`;
  md += `**Date**: ${result.commitMetadata.date}\n\n`;

  md += `## Metrics\n\n`;
  md += `| Metric | Score |\n`;
  md += `|--------|-------|\n`;
  md += `| Code Quality | ${result.metrics.codeQuality}/10 |\n`;
  md += `| Complexity | ${result.metrics.codeComplexity}/10 |\n`;
  md += `| Test Coverage | ${result.metrics.testCoverage}/10 |\n`;
  md += `| Quality Score | ${result.metrics.qualityScore}/10 |\n\n`;

  result.rounds.forEach((round) => {
    md += `## Round ${round.roundNumber}: ${round.roundName}\n\n`;
    round.agentResponses.forEach((response) => {
      md += `### ${response.emoji} ${response.agentName}\n\n`;
      md += `${response.response}\n\n`;
    });
  });

  return md;
}

analyzeResults();
```

---

## Error Handling

### Common Errors

```typescript
import { CodeWaveEvaluator, CodeWaveError } from 'codewave';

async function handleErrors() {
  const evaluator = new CodeWaveEvaluator({
    llmProvider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    const result = await evaluator.evaluate('invalid-commit');
  } catch (error) {
    if (error instanceof CodeWaveError) {
      console.error(`CodeWave Error: ${error.message}`);
      console.error(`Code: ${error.code}`);

      switch (error.code) {
        case 'COMMIT_NOT_FOUND':
          console.error('The specified commit was not found in the repository');
          break;
        case 'API_KEY_INVALID':
          console.error('The LLM API key is invalid or expired');
          break;
        case 'RATE_LIMITED':
          console.error('Rate limit exceeded, please retry later');
          break;
        case 'LARGE_DIFF':
          console.error('Diff is too large, consider enabling RAG');
          break;
      }
    } else {
      console.error('Unknown error:', error);
    }
  }
}

handleErrors();
```

---

## Configuration Programmatically

```typescript
import { CodeWaveEvaluator } from 'codewave';

const evaluator = new CodeWaveEvaluator({
  // LLM Configuration
  llmProvider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  apiKey: process.env.ANTHROPIC_API_KEY,

  // RAG Configuration (for large diffs)
  enableRag: true,
  ragChunkSize: 2000,
  ragThreshold: 102400, // 100KB

  // Token limits
  maxTokensPerRequest: 4000,

  // Output
  outputDirectory: './reports',
  reportFormat: 'all', // 'html', 'json', 'markdown', or 'all'

  // Logging
  verbose: process.env.DEBUG === 'true',
});
```

---

For more details on specific functionality, see related documentation:

- [CLI.md](./CLI.md) - Command-line interface
- [AGENTS.md](./AGENTS.md) - Agent specifications
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture

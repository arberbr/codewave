# CodeWave 🌊

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![LangChain](https://img.shields.io/badge/LangChain-1.0-green.svg)](https://langchain.com/)

> **AI-Powered Commit Intelligence**
> 
> Multi-agent conversational system for comprehensive code quality evaluation using the 7-pillar methodology. Powered by LangChain, LangGraph, and leading LLM providers (Anthropic Claude, OpenAI, Google Gemini).

---

## 🎯 Overview

**CodeWave** is a sophisticated AI-powered platform that evaluates Git commits through multi-agent conversations. Unlike traditional code review tools, CodeWave's agents engage in structured discussions across 3 rounds to reach consensus on code quality.

### 🏛️ Specialized AI Agents

- **Senior Reviewer Agent**: Code quality, maintainability, and best practices
- **Developer Agent**: Implementation complexity and technical approach
- **QA Engineer Agent**: Test coverage, edge cases, and quality assurance  
- **Security Analyst Agent**: Security vulnerabilities and best practices
- **Performance Specialist Agent**: Performance implications and optimizations
- **Metrics Aggregator**: Quantitative scores using 7-pillar methodology

### ⚡ Key Features

✨ **3-Round Conversations**: Initial Assessment → Concerns → Validation & Agreement  
🎯 **7-Pillar Methodology**: Comprehensive quality metrics (Impact, Tests, Quality, Complexity, Debt, etc.)  
🎨 **Beautiful HTML Reports**: Interactive browser-based evaluation with conversation timeline  
📊 **Batch Processing**: Evaluate multiple commits in parallel with real-time progress  
🔧 **Config-Driven**: Zero `.env` files - interactive setup wizard  
🤖 **Multi-LLM Support**: Anthropic Claude, OpenAI, Google Gemini  
⚡ **LangGraph Workflows**: Production-ready state machines for agent orchestration  
🔍 **RAG for Large Diffs**: Automatic vector store for commits >100KB  

---

## 📦 Installation

### Prerequisites

- **Node.js**: v18+ (tested on v20.19.24)
- **npm**: v9+
- **Git**: For generating commit diffs
- **LLM API Key**: OpenAI, Anthropic, or Google Gemini

### Quick Start

```bash
# Clone repository
git clone <repository-url>
cd codewave

# Install dependencies
npm install

# Build TypeScript
npm run build

# Interactive setup (first time)
node dist/cli/index.js config --init

# Evaluate a single commit
node dist/cli/index.js evaluate last-commit.diff

# Batch evaluate recent commits
node dist/cli/index.js batch --repo /path/to/repo --count 10
```

---

## 🚀 Usage

### Single Commit Evaluation

```bash
# Evaluate a specific commit
node dist/cli/index.js evaluate last-commit.diff
```

### Batch Commit Evaluation

```bash
# Evaluate last 5 commits from a repository
node dist/cli/index.js batch --repo /path/to/repo --count 5

# Evaluate commits within date range
node dist/cli/index.js batch --repo . --since "2024-01-01" --until "2024-12-31"
```

### Generate Diff File

```bash
# Get diff of last commit
git show HEAD > last-commit.diff

# Or diff between branches
git diff main..feature-branch > branch-diff.diff
```

### Output Structure

Evaluations are organized in **`.evaluated-commits/`** with the following structure:

```
.evaluated-commits/
└── [commit-hash]_[timestamp]/
    ├── report.html     # Main HTML report (Bootstrap UI)
    ├── results.json    # Full JSON results
    ├── commit.diff     # Original commit diff
    └── summary.txt     # Quick summary with metrics
```

**Example:**
```
.evaluated-commits/
└── 5581f306_2025-11-05_13-29-11/
    ├── report.html
    ├── results.json
    ├── commit.diff
    └── summary.txt
```

**Benefits:**
- 📁 **Organized by commit**: Each evaluation has its own directory
- 🔍 **Traceable**: Commit hash + timestamp for easy identification
- 📝 **Complete**: Original diff, JSON results, HTML report, and summary
- 🗂️ **Gitignored**: `.evaluated-commits/` automatically excluded from git

### Example Workflow

```bash
# 1. Create diff file
git show HEAD > my-commit.diff

# 2. Run evaluation
node dist/cli/index.js evaluate my-commit.diff

# Output:
# ✅ Evaluation complete!
# 📁 Output directory: .evaluated-commits/5581f306_2025-11-05_13-29-11
#    📄 report.html   - Main HTML report
#    📋 results.json  - Full JSON results
#    📝 commit.diff   - Original diff
#    📊 summary.txt   - Quick summary

# 3. View results
# Open .evaluated-commits/5581f306_2025-11-05_13-29-11/report.html in browser
```

### Compare Multiple Commits

```bash
# Evaluate multiple commits - each gets its own directory
git show HEAD~2 > commit1.diff
git show HEAD~1 > commit2.diff
git show HEAD > commit3.diff

node dist/cli/index.js evaluate commit1.diff
node dist/cli/index.js evaluate commit2.diff
node dist/cli/index.js evaluate commit3.diff

# View all evaluations
ls .evaluated-commits/
# a1b2c3d4_2025-11-05_10-15-30/
# e5f6g7h8_2025-11-05_11-20-45/
# 5581f306_2025-11-05_13-29-11/
```

---

## ⚙️ Configuration

### Config File: `.commit-evaluator.config.json`

Create a config file in your project root:

```json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "temperature": 0.2,
    "maxTokens": 4096,
    "maxInputTokens": 200000,
    "tokenBuffer": 1000,
    "apiKey": "sk-ant-api03-..."
  },
  "agents": {
    "enabled": ["senior-reviewer", "developer", "qa-engineer", "metrics"],
    "parallel": false,
    "timeout": 300000,
    "retries": 2
  },
  "logging": {
    "level": "info",
    "file": "commit-evaluator.log",
    "console": true
  },
  "tracing": {
    "enabled": false,
    "project": "commit-evaluator"
  }
}
```

### Interactive Setup

If no config file exists, the CLI will prompt you for required settings:

```
? Select LLM provider: (Use arrow keys)
  ❯ anthropic
    openai
    google

? Enter model name: claude-3-5-sonnet-20241022

? Enter API key: ****************************************
```

### Configuration Options

#### LLM Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `provider` | `'anthropic' \| 'openai' \| 'google'` | `'anthropic'` | LLM provider |
| `model` | `string` | `'claude-3-5-sonnet-20241022'` | Model identifier |
| `temperature` | `number` | `0.2` | Sampling temperature (0-1) |
| `maxTokens` | `number` | `4096` | Max output tokens |
| `maxInputTokens` | `number` | `200000` | Max input tokens |
| `tokenBuffer` | `number` | `1000` | Token safety buffer |
| `apiKey` | `string` | - | API key (or prompted) |

#### Agent Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `string[]` | All agents | Agents to run |
| `parallel` | `boolean` | `false` | Run agents in parallel |
| `timeout` | `number` | `300000` | Timeout per agent (ms) |
| `retries` | `number` | `2` | Discussion rounds |

#### Logging Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `level` | `'debug' \| 'info' \| 'warn' \| 'error'` | `'info'` | Log verbosity |
| `file` | `string` | `'commit-evaluator.log'` | Log file path |
| `console` | `boolean` | `true` | Console logging |

---

## 🤖 Agents

### Senior Reviewer Agent

**Focus**: Code quality, maintainability, best practices

**Output**:
- **Summary**: High-level assessment of code changes
- **Details**: Analysis of readability, maintainability, design patterns
- **Metrics**: 
  - `codeQuality` (0-10): Overall code quality score
  - `maintainability` (0-10): Ease of maintenance
  - `bestPractices` (0-10): Adherence to standards

### Developer Agent

**Focus**: Implementation approach, technical complexity

**Output**:
- **Summary**: Implementation quality and technical decisions
- **Details**: Architecture, error handling, performance considerations
- **Metrics**:
  - `implementationQuality` (0-10): Implementation approach
  - `technicalDebt` (0-10): Introduced technical debt
  - `complexity` (0-10): Code complexity

### QA Engineer Agent

**Focus**: Testing, edge cases, quality assurance

**Output**:
- **Summary**: Test coverage and quality assessment
- **Details**: Test completeness, edge case handling, validation
- **Metrics**:
  - `testCoverage` (0-10): Test completeness
  - `edgeCaseHandling` (0-10): Edge case coverage
  - `qualityAssurance` (0-10): Overall QA quality

### Metrics Agent

**Focus**: Aggregate quantitative analysis

**Output**:
- **Summary**: Overall commit evaluation
- **Details**: Statistical analysis of all agent scores
- **Metrics**:
  - Averages of all numeric metrics
  - Min/max scores across agents
  - Overall commit quality score

---

## 🏗️ Architecture

### Project Structure

```
commit-evaluator-app/
├── cli/
│   ├── index.ts                    # CLI entry point
│   └── commands/
│       └── evaluate-command.ts     # Evaluate command handler
├── src/
│   ├── index.ts                    # Main entry
│   ├── agents/
│   │   ├── agent.interface.ts      # Agent interface
│   │   ├── agent-registry.ts       # Agent registration
│   │   ├── base-agent-workflow.ts  # Base LCEL workflow
│   │   ├── senior-reviewer-agent.ts
│   │   ├── developer-agent.ts
│   │   ├── qa-engineer-agent.ts
│   │   └── metrics-agent.ts
│   ├── config/
│   │   ├── config.interface.ts     # Config type definitions
│   │   ├── config-loader.ts        # Config loading + prompts
│   │   └── default-config.ts       # Default values
│   ├── formatters/
│   │   └── html-report-formatter.ts # HTML generation
│   ├── llm/
│   │   └── llm-service.ts          # Multi-provider LLM service
│   ├── orchestrator/
│   │   └── commit-evaluation-orchestrator.ts # Agent coordination
│   └── types/
│       └── agent.types.ts          # Type definitions
├── test/
│   └── commit-evaluator.e2e-spec.ts
├── index.html                      # HTML report viewer
├── package.json
├── tsconfig.json
└── README.md
```

### Key Design Patterns

#### 1. Multi-Agent Orchestration

```typescript
// Orchestrator runs agents in discussion rounds
for (let round = 0; round < config.agents.retries; round++) {
  for (const agent of agents) {
    const result = await agent.execute(context);
    context.agentResults.push(result);
  }
}
```

#### 2. LangChain LCEL Workflows

```typescript
// Each agent uses RunnableSequence for LLM chains
const chain = RunnableSequence.from([
  promptBuilder,
  llmModel,
  contentExtractor,
  outputParser
]);

const result = await chain.invoke(input);
```

#### 3. Config-Driven Execution

```typescript
// No .env files - config loaded from JSON or interactive prompts
const config = await ConfigLoader.load();
const llm = LLMService.getChatModel(config.llm);
```

---

## 📊 HTML Reports

### Report Structure

The generated HTML report includes:

1. **Header**: Evaluation timestamp, configuration summary
2. **Agent Sections**: Each agent's analysis with:
   - Summary (high-level findings)
   - Details (in-depth analysis)
   - Metrics (quantitative scores)
3. **Footer**: Metadata and generation info

### Example Report

```html
<!-- Generated report.html -->
<div class="agent-section">
  <h2>Senior Reviewer Analysis</h2>
  <div class="summary">
    <h3>Summary</h3>
    <p>The commit introduces well-structured TypeScript code...</p>
  </div>
  <div class="details">
    <h3>Details</h3>
    <p>- Code follows TypeScript best practices<br>
       - Proper error handling implemented<br>
       - Clear separation of concerns</p>
  </div>
  <div class="metrics">
    <h3>Metrics</h3>
    <table>
      <tr><td>Code Quality</td><td>8/10</td></tr>
      <tr><td>Maintainability</td><td>7/10</td></tr>
    </table>
  </div>
</div>
```

---

## 🔧 Development

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

### Format

```bash
npm run prettier
```

### Testing

```bash
# Run end-to-end tests
npm run test:e2e
```

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- Inspired by [architecture-doc-generator](https://github.com/your-org/architecture-doc-generator)
- Built with [LangChain](https://langchain.com/) LCEL workflows
- Powered by OpenAI, Anthropic, and Google Gemini LLMs

---

## 📚 Related Projects

- **[architecture-doc-generator](https://github.com/your-org/architecture-doc-generator)**: AI-powered architecture documentation generator
- **[tech-debt-api](https://github.com/your-org/tech-debt-api)**: NestJS-based technical debt analysis API

---

**Made with ❤️ by the TechDebt team**
# CodeWave Quick Reference

Fast lookup guide for common commands and usage patterns.

## Installation & Setup (2 minutes)

```bash
# Install
npm install -g codewave

# First-time setup
codewave config

# Verify installation
codewave evaluate --help
```

---

## Most Common Commands

### Evaluate a Single Commit

```bash
# Evaluate HEAD commit
codewave evaluate HEAD

# Evaluate specific commit
codewave evaluate abc1234

# Evaluate with verbose output
codewave evaluate HEAD --verbose

# Save to custom directory
codewave evaluate HEAD -o ./my-reports
```

### Evaluate Multiple Commits

```bash
# Last 10 commits (default)
codewave batch-evaluate

# Last 50 commits
codewave batch-evaluate --count 50

# Date range
codewave batch-evaluate --since "2024-01-01" --until "2024-01-31"

# Specific branch
codewave batch-evaluate --branch develop --count 20

# With parallelization
codewave batch-evaluate --count 100 --parallel 5
```

### Configuration

```bash
# Interactive setup
codewave config

# Show current config
codewave config show

# Change API key
codewave config set api-key sk-ant-...

# Change model
codewave config set model claude-3-opus-20250219

# Enable verbose logging
codewave config set verbose true
```

---

## 7-Pillar Metrics at a Glance

| Metric | Scale | Agent | Meaning |
|--------|-------|-------|---------|
| **Code Quality** | 1-10 | Dev Reviewer 🔍 | Correctness, design, readability |
| **Complexity** | 10-1* | Architect 🏛️ | 10=simple, 1=complex |
| **Ideal Time** | Hours | Analyst 🎯 | Perfect scenario time |
| **Actual Time** | Hours | Author 👨‍💻 | Time actually spent |
| **Tech Debt** | +/- Hours | Architect 🏛️ | Debt added (+) or removed (-) |
| **Impact** | 1-10 | Analyst 🎯 | Business/user value |
| **Test Coverage** | 1-10 | QA 🧪 | Test comprehensiveness |

\* Lower is better

---

## Scoring Interpretation

### Code Quality (1-10)

- **9-10**: Exemplary, production-ready
- **7-8**: Good, minor improvements possible
- **5-6**: Acceptable, some issues present
- **3-4**: Problematic, significant improvements needed
- **1-2**: Poor, serious issues

### Test Coverage (1-10)

- **9-10**: Comprehensive, all scenarios tested
- **7-8**: Good coverage, minor gaps
- **5-6**: Adequate coverage, some gaps
- **3-4**: Sparse coverage, many gaps
- **1-2**: Minimal or no tests

### Overall Quality Score

- **8-10**: High quality commit
- **6-8**: Acceptable quality
- **4-6**: Needs improvement
- **1-4**: Significant issues

---

## Output Files Explained

```
.evaluated-commits/
└── abc1234_2024-01-15_10-30-45/
    ├── report.html          👈 Open in browser
    ├── results.json         👈 Programmatic access
    ├── commit.diff          📋 Original diff
    └── summary.txt          📝 Quick reference
```

### Which File to Use?

- **report.html**: Best for reading and sharing
- **results.json**: For scripts and CI/CD
- **summary.txt**: Quick overview in terminal
- **commit.diff**: Archival and reference

---

## Understanding Your Report

### The 7 Pillars at a Glance

Every commit is evaluated across 7 dimensions:

| Metric | Scale | What It Means | Good Score |
|--------|-------|--------------|------------|
| Code Quality | 1-10 | Correctness, design, readability | 8+ |
| Complexity | 10-1* | How simple/complex the code is | 8+* |
| Ideal Time | Hours | Perfect-case implementation time | Fits sprint |
| Actual Time | Hours | Real time developer spent | ≈ Ideal time |
| Tech Debt | +/- Hours | Debt added/removed | Negative (debt removed) |
| Functional Impact | 1-10 | Business value to users | 8+ |
| Test Coverage | 1-10 | Test comprehensiveness | 8+ |

*Lower complexity score (1-3) means complex, higher score (8-10) means simple

### Quick Interpretation

**Good Commit Pattern:**
```
✓ Code Quality: 8+
✓ Complexity: 8+ (simple, reversed scale)
✓ Actual ≈ Ideal time (or better)
✓ Functional Impact: 7+
✓ Test Coverage: 7+
✓ Tech Debt: 0 or negative (improved)
```

**Red Flags:**
```
⚠️ Code Quality < 6: Needs review/refactoring
⚠️ Complexity < 5: Refactor for clarity
⚠️ Actual >> Ideal: Unexpected complexity
⚠️ Test Coverage < 5: Add tests before shipping
⚠️ Tech Debt > 3 hours: Plan follow-up PR
```

### Developer Overview

The first section of your report - a quick AI-generated summary:
- **Summary**: One-line overview (10 seconds)
- **Details**: Brief explanation (30 seconds)
- **Key Changes**: What actually changed (1 minute)

**Why it matters**: Skip reading the full diff!

### Multi-Round Conversation

Agents discuss across 3 rounds:
1. **Round 1**: Each agent's initial assessment
2. **Round 2**: Agents raise concerns and challenge assumptions
3. **Round 3**: Final validation and consensus

**Look for**: Where agents disagree (highlights trade-offs)

### Convergence Score

Shows how much agents agreed (0.0 to 1.0):
- **0.9+**: Strong consensus, reliable
- **0.7-0.8**: Good consensus, minor disagreements
- **0.5-0.6**: Moderate agreement, investigate
- **<0.5**: Low consensus, needs discussion

**Pattern**: Low convergence = commit is controversial

---

## Environment Variables (Override Config)

```bash
# LLM Setup
export CODEWAVE_LLM_PROVIDER=anthropic
export CODEWAVE_API_KEY=sk-ant-...
export CODEWAVE_MODEL=claude-3-5-sonnet-20241022

# Output
export CODEWAVE_OUTPUT_DIR=./reports
export CODEWAVE_REPORT_FORMAT=json

# Performance
export CODEWAVE_PARALLEL=5
export CODEWAVE_BATCH_SIZE=50

# Logging
export CODEWAVE_VERBOSE=true
```

---

## Agent Profiles

### Business Analyst 🎯
- **Evaluates**: Functional Impact, Ideal Time
- **Asks**: "What is the business value?"
- **Concerns**: Scope creep, missing requirements

### Developer Author 👨‍💻
- **Evaluates**: Actual Time Spent
- **Asks**: "How long did this actually take?"
- **Concerns**: Unclear requirements, unexpected complexity

### Developer Reviewer 🔍
- **Evaluates**: Code Quality
- **Asks**: "Does this code work correctly?"
- **Concerns**: Bugs, poor design, readability

### Senior Architect 🏛️
- **Evaluates**: Complexity, Technical Debt
- **Asks**: "Is this scalable and maintainable?"
- **Concerns**: Architectural issues, debt

### QA Engineer 🧪
- **Evaluates**: Test Coverage
- **Asks**: "Are we confident this works?"
- **Concerns**: Untested scenarios, edge cases

---

## LLM Provider Comparison

| Provider | Model | Speed | Quality | Cost | Notes |
|----------|-------|-------|---------|------|-------|
| **Anthropic** | Sonnet | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | Recommended |
| **Anthropic** | Opus | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | Best quality |
| **Anthropic** | Haiku | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | Budget option |
| **OpenAI** | GPT-4o | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | Good alternative |
| **Google** | Gemini | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | Most cost-effective |

---

## Cost Estimation

### Per Commit

- **Fast model**: ~$0.01-0.02
- **Balanced model**: ~$0.015-0.03
- **Best quality**: ~$0.05-0.10

### Batch Processing

- **10 commits**: ~$0.15-0.30
- **100 commits**: ~$1.50-3.00
- **1,000 commits**: ~$15-30

---

## Common Workflows

### 1. Evaluate Recent Work (5 minutes)

```bash
# Setup (first time only)
codewave config

# Evaluate last 5 commits
codewave batch-evaluate --count 5

# Open report
open .evaluated-commits/*/report.html
```

### 2. CI/CD Quality Gate

```bash
# In pipeline:
codewave evaluate $CI_COMMIT_SHA --format json > results.json

# Check quality:
quality=$(jq '.metrics.codeQuality' results.json)
if (( $(echo "$quality < 7" | bc -l) )); then
  echo "Quality below threshold"
  exit 1
fi
```

### 3. Team Code Review Insights

```bash
# Evaluate all commits from team member this month
codewave batch-evaluate --since "2024-01-01" --until "2024-01-31" --count 100

# Analyze trends
for file in .evaluated-commits/*/results.json; do
  jq '.metrics.codeQuality' "$file" >> qualities.txt
done

# Calculate average
awk '{sum+=$1; count++} END {print sum/count}' qualities.txt
```

### 4. Large Commit Analysis

```bash
# Automatically uses RAG for large diffs
codewave evaluate abc1234 --verbose

# Or force RAG:
codewave config set enable-rag true
codewave evaluate abc1234
```

---

## Troubleshooting Quick Fixes

### Error: "API Key not found"
```bash
codewave config set api-key sk-ant-...
```

### Error: "Rate limit exceeded"
```bash
# Slow down
codewave config set parallel-evaluations 1
codewave batch-evaluate --count 10
```

### Error: "Out of memory"
```bash
# Reduce parallelization
codewave config set parallel-evaluations 1
```

### Error: "Timeout"
```bash
# Enable RAG for large diffs
codewave config set enable-rag true
# OR use faster model
codewave config set model claude-3-haiku-20240307
```

### Error: "Too expensive"
```bash
# Use cheaper model
codewave config set llm-provider google
codewave config set model gemini-2.0-flash
```

---

## Keyboard Shortcuts (Config Menu)

During interactive config:

- **↑/↓**: Navigate options
- **Enter**: Select option
- **q**: Quit
- **Ctrl+C**: Cancel

---

## File Locations

### Configuration
- **macOS/Linux**: `~/.codewave/config.json`
- **Windows**: `%APPDATA%\codewave\config.json`

### Results
- **Default**: `.evaluated-commits/`
- **Custom**: Set with `-o` flag or config

### Logs
- **Runtime**: `stdout`
- **Verbose**: Use `--verbose` flag

---

## CLI Arguments Quick Guide

### evaluate
```
codewave evaluate <commit> [options]
  <commit>             Commit hash or reference
  -o, --output <dir>   Output directory
  --format <format>    json|html|markdown|all
  --verbose            Verbose output
  --no-report          Skip HTML generation
```

### batch-evaluate
```
codewave batch-evaluate [options]
  --count <num>        Commits to evaluate (default: 10)
  --since <date>       Start date
  --until <date>       End date
  --branch <branch>    Branch to evaluate
  -o, --output <dir>   Output directory
  --parallel <num>     Parallel evaluations (max: 5)
  --skip-errors        Continue on errors
  --verbose            Verbose output
```

### config
```
codewave config [command]
  (no args)            Interactive setup
  show                 Show current config
  set <key> <value>    Set value
  reset                Reset to defaults
```

---

## JSON Results Structure

```json
{
  "commitHash": "abc1234",
  "metrics": {
    "codeQuality": 8.5,
    "codeComplexity": 7.0,
    "idealTimeHours": 2.0,
    "actualTimeHours": 3.5,
    "technicalDebtHours": 0.5,
    "functionalImpact": 8.0,
    "testCoverage": 8.5,
    "qualityScore": 8.1,
    "overallScore": 7.9
  },
  "consensus": {
    "topConcerns": ["..."],
    "recommendations": ["..."],
    "confidenceLevel": "high"
  },
  "conversation": [
    {
      "round": 1,
      "agent": "Developer Reviewer",
      "response": "..."
    }
  ]
}
```

---

## Tips & Tricks

### Speed Up Evaluation
```bash
# Use fastest model
codewave config set model claude-3-haiku-20240307
# Use max parallelization
codewave config set parallel-evaluations 5
```

### Get Best Quality
```bash
# Use best model
codewave config set model claude-3-opus-20250219
# Use sequential processing
codewave config set parallel-evaluations 1
```

### Save Money
```bash
# Use Google Gemini (10x cheaper)
codewave config set llm-provider google
codewave config set model gemini-2.0-flash
```

### Debug Issues
```bash
# Enable verbose logging
codewave config set verbose true
codewave evaluate HEAD --verbose
```

### Batch Process Efficiently
```bash
# Process 1000 commits in ~30 minutes
codewave batch-evaluate --count 1000 --parallel 5 --since "2024-01-01"
```

---

## Getting Help

```bash
# General help
codewave --help

# Command help
codewave evaluate --help
codewave batch-evaluate --help

# Configuration help
codewave config --help

# Issues
https://github.com/techdebtgpt/codewave/issues
```

---

For detailed information, see:
- [README.md](../README.md) - Complete documentation
- [AGENTS.md](./AGENTS.md) - Agent specifications
- [CONFIGURATION.md](./CONFIGURATION.md) - Configuration details
- [API.md](./API.md) - Programmatic API

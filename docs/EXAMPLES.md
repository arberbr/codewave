# CodeWave Examples & Tutorials

Real-world examples and tutorials for common CodeWave use cases.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Single Commit Evaluation](#single-commit-evaluation)
3. [Batch Processing](#batch-processing)
4. [CI/CD Integration](#cicd-integration)
5. [Data Analysis](#data-analysis)
6. [Team Workflows](#team-workflows)
7. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Installation (5 minutes)

```bash
# Install globally
npm install -g codewave

# Or install locally
npm install codewave

# Verify installation
codewave --version
# Output: 1.0.0
```

### Initial Setup (2 minutes)

```bash
# Run interactive configuration
codewave config

# Follow prompts:
# 1. Choose LLM provider (Anthropic recommended)
# 2. Enter API key
# 3. Select model
# 4. Confirm defaults

# Verify configuration
codewave config show
```

### First Evaluation (2 minutes)

```bash
# Navigate to any Git repository
cd ~/my-project

# Evaluate the latest commit
codewave evaluate HEAD

# Open the report
open .evaluated-commits/*/report.html
```

---

## Single Commit Evaluation

### Use Case: Code Review Assistant

Evaluate a specific commit to get detailed feedback before merging.

#### Scenario

You've completed a feature and want to understand its code quality before requesting review.

#### Command

```bash
# Evaluate your feature commit
codewave evaluate HEAD

# Or evaluate a specific commit
codewave evaluate abc1234def5678

# With verbose output for debugging
codewave evaluate HEAD --verbose
```

#### Workflow

```bash
# 1. Make sure your work is committed
git commit -m "feat: implement user authentication"

# 2. Run CodeWave evaluation
codewave evaluate HEAD

# 3. Review the HTML report
open .evaluated-commits/abc1234*/report.html

# 4. Address any concerns identified
# - Code Quality issues
# - Test Coverage gaps
# - Complexity concerns
# - Tech Debt

# 5. Commit fixes if needed
git add .
git commit -m "test: improve authentication test coverage"

# 6. Re-evaluate to verify improvements
codewave evaluate HEAD
```

#### Interpreting Results

```json
{
  "metrics": {
    "codeQuality": 7.5,           // Good, room for improvement
    "codeComplexity": 7.0,        // Acceptable complexity
    "idealTimeHours": 8,          // Feature estimated at 8 hours
    "actualTimeHours": 12,        // Took 12 hours (1.5x ideal)
    "technicalDebtHours": 2,      // Added 2 hours of debt
    "functionalImpact": 8.5,      // High business value
    "testCoverage": 6.5,          // Needs better test coverage
    "qualityScore": 7.3           // Overall acceptable
  },
  "consensus": {
    "topConcerns": [
      "Test coverage below 70%",
      "Missing edge case handling",
      "Could benefit from refactoring"
    ],
    "recommendations": [
      "Add integration tests",
      "Handle null/undefined cases",
      "Simplify authentication logic"
    ]
  }
}
```

### Use Case: Pull Request Validation

Check a branch before creating a PR.

```bash
# Evaluate latest commit on feature branch
git checkout feature/payment-system
codewave evaluate HEAD

# Open report to review
open .evaluated-commits/*/report.html

# If issues found, fix and re-evaluate
git add .
git commit -m "fix: improve error handling in payment validation"
codewave evaluate HEAD

# Once satisfied, create PR
git push origin feature/payment-system
```

---

## Batch Processing

### Use Case: Team Performance Analytics

Evaluate all commits from a team member to identify patterns.

#### Scenario

You want to understand team productivity and code quality trends.

#### Command

```bash
# Last 50 commits from main branch
codewave batch-evaluate --count 50 --branch main

# Last 30 days of commits
codewave batch-evaluate --since "30 days ago"

# Specific date range
codewave batch-evaluate \
  --since 2024-01-01 \
  --until 2024-01-31

# Multiple cores for speed
codewave batch-evaluate --count 100 --parallel 5
```

#### Analysis Script

After batch evaluation, analyze results:

```bash
#!/bin/bash

# Calculate average quality score
echo "=== Quality Analysis ==="
for file in .evaluated-commits/*/results.json; do
  jq '.metrics.codeQuality' "$file"
done | awk '{sum+=$1; count++} END {print "Average Quality: " sum/count "/10"}'

# Calculate average test coverage
echo "=== Test Coverage ==="
for file in .evaluated-commits/*/results.json; do
  jq '.metrics.testCoverage' "$file"
done | awk '{sum+=$1; count++} END {print "Average Coverage: " sum/count "/10"}'

# Count commits with concerns
echo "=== Quality Issues ==="
for file in .evaluated-commits/*/results.json; do
  jq '.consensus.topConcerns | length' "$file"
done | awk '{sum+=$1} END {print "Total Concerns: " sum}'
```

#### Team Metrics Dashboard

```bash
#!/bin/bash

# Generate team dashboard
echo "# Team Performance Report"
echo ""
echo "## Evaluation Period: Last 30 Days"
echo ""

# Count commits
count=$(find .evaluated-commits -name results.json | wc -l)
echo "**Total Commits Evaluated:** $count"
echo ""

# Quality distribution
echo "## Quality Distribution"
echo "| Quality Score | Count |"
echo "|---------------|-------|"
for score in 9 8 7 6 5; do
  count=$(find .evaluated-commits -name results.json -exec \
    jq "select(.metrics.qualityScore >= $score and .metrics.qualityScore < ($score+1))" {} \; | wc -l)
  echo "| $score-$((score+1)) | $count |"
done
echo ""

# Top concerns
echo "## Top Concerns Identified"
find .evaluated-commits -name results.json | head -10 | xargs -I {} \
  jq '.consensus.topConcerns[]' {} | sort | uniq -c | sort -rn | head -5
```

#### Example Output

```
Team Performance Report
=======================

Total Commits Evaluated: 50
Evaluation Period: January 2024

Quality Distribution:
  9-10: 5 commits (10%)
  8-9:  15 commits (30%)
  7-8:  20 commits (40%)
  6-7:  8 commits (16%)
  5-6:  2 commits (4%)

Average Metrics:
  Quality:        7.5 / 10
  Complexity:     6.8 / 10
  Test Coverage:  7.2 / 10
  Tech Debt:      +1.2 hrs/commit

Top Concerns:
  1. Insufficient test coverage (15 commits)
  2. Complex conditional logic (8 commits)
  3. Missing error handling (6 commits)
  4. Tight coupling (4 commits)
  5. Inadequate documentation (3 commits)

Recommendations:
  - Establish minimum test coverage standard (80%)
  - Conduct refactoring workshop for complex logic
  - Create error handling checklist
```

---

## CI/CD Integration

### Use Case: Automated Quality Gates

Enforce quality standards in CI/CD pipeline.

#### GitLab CI Example

```yaml
# .gitlab-ci.yml

code_quality_gate:
  stage: quality
  image: node:18
  script:
    # Install CodeWave
    - npm install -g codewave

    # Configure CodeWave
    - |
      codewave config set llm-provider $LLM_PROVIDER
      codewave config set api-key $LLM_API_KEY
      codewave config set model claude-3-5-sonnet-20241022

    # Evaluate the commit
    - codewave evaluate $CI_COMMIT_SHA --format json -o ./ci-results --no-report

    # Extract metrics
    - |
      QUALITY=$(jq '.metrics.codeQuality' ./ci-results/*/results.json)
      COVERAGE=$(jq '.metrics.testCoverage' ./ci-results/*/results.json)
      DEBT=$(jq '.metrics.technicalDebtHours' ./ci-results/*/results.json)

    # Quality gates
    - |
      if (( $(echo "$QUALITY < 7" | bc -l) )); then
        echo "❌ Code Quality ($QUALITY) below threshold (7)"
        exit 1
      fi

      if (( $(echo "$COVERAGE < 7" | bc -l) )); then
        echo "❌ Test Coverage ($COVERAGE) below threshold (7)"
        exit 1
      fi

      if (( $(echo "$DEBT > 5" | bc -l) )); then
        echo "❌ Technical Debt ($DEBT hrs) exceeds limit (5 hrs)"
        exit 1
      fi

    - echo "✅ All quality gates passed"

  artifacts:
    paths:
      - ci-results/
    reports:
      junit: ci-results/*/results.json

  only:
    - merge_requests

  environment:
    CODEWAVE_VERBOSE: "false"
```

#### GitHub Actions Example

```yaml
# .github/workflows/quality-gate.yml

name: Code Quality Gate

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Full history for commit analysis

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install CodeWave
        run: npm install -g codewave

      - name: Configure CodeWave
        run: |
          codewave config set llm-provider anthropic
          codewave config set api-key ${{ secrets.ANTHROPIC_API_KEY }}
          codewave config set model claude-3-5-sonnet-20241022

      - name: Evaluate Commit
        run: |
          codewave evaluate ${{ github.event.pull_request.head.sha }} \
            --format json \
            -o ./ci-results \
            --no-report

      - name: Check Quality Gates
        run: |
          QUALITY=$(jq '.metrics.codeQuality' ./ci-results/*/results.json)
          COVERAGE=$(jq '.metrics.testCoverage' ./ci-results/*/results.json)

          if (( $(echo "$QUALITY < 7" | bc -l) )); then
            echo "::error::Code Quality ($QUALITY/10) below threshold"
            exit 1
          fi

          if (( $(echo "$COVERAGE < 7" | bc -l) )); then
            echo "::error::Test Coverage ($COVERAGE/10) below threshold"
            exit 1
          fi

          echo "✅ All quality gates passed"

      - name: Upload Results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: codewave-results
          path: ci-results/
```

#### Jenkins Pipeline Example

```groovy
// Jenkinsfile

pipeline {
    agent any

    environment {
        LLM_PROVIDER = 'anthropic'
        LLM_API_KEY = credentials('anthropic-api-key')
    }

    stages {
        stage('Setup CodeWave') {
            steps {
                sh '''
                    npm install -g codewave
                    codewave config set llm-provider ${LLM_PROVIDER}
                    codewave config set api-key ${LLM_API_KEY}
                    codewave config set model claude-3-5-sonnet-20241022
                '''
            }
        }

        stage('Evaluate Commit') {
            steps {
                sh '''
                    codewave evaluate HEAD \
                        --format json \
                        -o ./ci-results \
                        --no-report
                '''
            }
        }

        stage('Quality Gates') {
            steps {
                script {
                    def results = readJSON file: './ci-results/*/results.json'
                    def quality = results.metrics.codeQuality
                    def coverage = results.metrics.testCoverage

                    if (quality < 7) {
                        error("Code Quality ($quality/10) below threshold")
                    }

                    if (coverage < 7) {
                        error("Test Coverage ($coverage/10) below threshold")
                    }

                    println "✅ All quality gates passed"
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'ci-results/**/*'
        }
    }
}
```

---

## Data Analysis

### Use Case: Track Code Quality Over Time

Monitor quality trends across project history.

#### Python Analysis Script

```python
#!/usr/bin/env python3

import json
import os
from pathlib import Path
from datetime import datetime
from statistics import mean, stdev

# Collect all results
results_dir = Path('.evaluated-commits')
results = []

for result_file in results_dir.glob('*/results.json'):
    with open(result_file, 'r') as f:
        data = json.load(f)
        results.append({
            'commit': data['commitHash'],
            'date': data['metadata']['endTime'],
            'quality': data['metrics']['codeQuality'],
            'complexity': data['metrics']['codeComplexity'],
            'coverage': data['metrics']['testCoverage'],
            'debt': data['metrics']['technicalDebtHours'],
        })

# Sort by date
results.sort(key=lambda x: x['date'])

# Calculate trends
print("=== Code Quality Trends ===\n")

qualities = [r['quality'] for r in results]
coverages = [r['coverage'] for r in results]
debts = [r['debt'] for r in results]

print(f"Quality Score:")
print(f"  Average: {mean(qualities):.2f}/10")
print(f"  Std Dev: {stdev(qualities):.2f}")
print(f"  Trend: {'↑ Improving' if qualities[-1] > mean(qualities) else '↓ Declining'}")

print(f"\nTest Coverage:")
print(f"  Average: {mean(coverages):.2f}/10")
print(f"  Std Dev: {stdev(coverages):.2f}")
print(f"  Trend: {'↑ Improving' if coverages[-1] > mean(coverages) else '↓ Declining'}")

print(f"\nTechnical Debt:")
print(f"  Average: {mean(debts):.2f} hours/commit")
print(f"  Std Dev: {stdev(debts):.2f}")
print(f"  Trend: {'↑ Accumulating' if debts[-1] > mean(debts) else '↓ Reducing'}")

# Identify patterns
poor_quality = [r for r in results if r['quality'] < 6]
print(f"\nLow Quality Commits ({len(poor_quality)}):")
for r in poor_quality:
    print(f"  - {r['commit'][:8]}: {r['quality']:.1f}/10")
```

---

## Team Workflows

### Team Code Review Process

Integrate CodeWave into team workflow:

#### 1. Pre-Push Check

```bash
#!/bin/bash
# .git/hooks/pre-push (or pre-commit)

# Evaluate current commit before pushing
COMMIT=$(git rev-parse HEAD)
codewave evaluate $COMMIT --format json -o ./.tmp

# Check quality threshold
QUALITY=$(jq '.metrics.codeQuality' .tmp/*/results.json)

if (( $(echo "$QUALITY < 6.5" | bc -l) )); then
    echo "⚠️  Warning: Code quality ($QUALITY/10) is below recommendation"
    echo "Consider addressing concerns before pushing"

    # Show top concerns
    jq '.consensus.topConcerns[]' .tmp/*/results.json

    # Allow override
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

rm -rf .tmp
```

#### 2. PR Review Process

```bash
# For each PR, run CodeWave evaluation on main commits
for commit in $(git log origin/main..HEAD --pretty=format:%H); do
    codewave evaluate $commit
done

# Review all reports
open .evaluated-commits/*/report.html
```

#### 3. Sprint Retrospective

```bash
#!/bin/bash
# Analyze all commits from sprint

SPRINT_START="2024-01-08"
SPRINT_END="2024-01-19"

codewave batch-evaluate \
    --since $SPRINT_START \
    --until $SPRINT_END \
    --parallel 5

# Generate report
python3 analyze_sprint.py
```

---

## Troubleshooting

### Problem: "API Key not found"

```bash
# Check configuration
codewave config show

# Set API key if missing
codewave config set api-key sk-ant-...
```

### Problem: Slow Evaluations

```bash
# Use faster model
codewave config set model claude-3-haiku-20240307

# Enable RAG for large diffs
codewave config set enable-rag true

# Skip report generation
codewave evaluate HEAD --no-report --format json
```

### Problem: High Costs

```bash
# Use cheaper provider
codewave config set llm-provider google
codewave config set model gemini-2.0-flash

# Reduce parallelization
codewave config set parallel-evaluations 1
```

### Problem: Rate Limiting

```bash
# Reduce parallelization
codewave config set parallel-evaluations 1

# Add delays between requests
codewave batch-evaluate --count 10 --parallel 1 --skip-errors

# Use different provider
codewave config set llm-provider openai
```

### Problem: Memory Issues

```bash
# Reduce batch size
codewave batch-evaluate --count 10  # Instead of 100

# Process sequentially
codewave config set parallel-evaluations 1

# Skip large files if possible
```

---

For more information:
- [README.md](../README.md) - Main documentation
- [CLI.md](./CLI.md) - CLI reference
- [API.md](./API.md) - Programmatic API
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Detailed troubleshooting

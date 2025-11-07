# CodeWave Documentation Index

Complete guide to all CodeWave documentation.

## Getting Started

**Start here** if you're new to CodeWave:

1. **[README.md](../README.md)** (714 lines)
   - Overview and features
   - Installation instructions
   - Quick start guide
   - 7-pillar methodology
   - Agent profiles
   - Output structure
   - Performance metrics
   - Contributing guidelines

## Documentation by Topic

### Quick References

- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** (473 lines)
  - Fast lookup for common commands
  - Scoring interpretation
  - Output files guide
  - Agent profiles summary
  - Cost estimation
  - Common workflows
  - Keyboard shortcuts

### Core Concepts

- **[AGENTS.md](./AGENTS.md)** (669 lines)
  - Detailed agent specifications
  - Agent interaction model
  - Weights and scoring
  - Conversation flows
  - Integration patterns
  - Common disagreements
  - Round-by-round details

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** (811 lines)
  - System overview and diagrams
  - Technology stack
  - Core components
  - Data flow
  - Multi-agent orchestration
  - LLM integration
  - RAG system
  - Output generation
  - State management
  - Error handling

### Usage Documentation

- **[CLI.md](./CLI.md)** (708 lines)
  - Global options
  - evaluate command reference
  - batch-evaluate command reference
  - config command reference
  - Exit codes
  - 10+ detailed examples
  - Shell completion
  - Tips and tricks

- **[CONFIGURATION.md](./CONFIGURATION.md)** (687 lines)
  - Quick start (2 minutes)
  - Configuration methods
  - All configuration options
  - LLM provider setup (Anthropic, OpenAI, Google)
  - Advanced configuration
  - Environment variables
  - Configuration file format
  - Troubleshooting configuration issues

- **[EXAMPLES.md](./EXAMPLES.md)** (688 lines)
  - Getting started tutorial
  - Single commit evaluation
  - Batch processing
  - CI/CD integration (GitLab, GitHub, Jenkins)
  - Data analysis scripts
  - Team workflows
  - Code examples (bash, Python, YAML)

### Developers

- **[API.md](./API.md)** (716 lines)
  - Core classes (CodeWaveEvaluator)
  - Agent interface
  - Type definitions
  - Services (LLM, Commit, VectorStore)
  - Usage examples
  - Error handling
  - Configuration programmatically

### Support

- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** (824 lines)
  - Installation issues
  - Configuration issues
  - API & authentication
  - Evaluation issues
  - Performance issues
  - Output issues
  - Advanced debugging
  - Quick fix checklist

## Documentation Statistics

| Document | Lines | Topic | Audience |
|----------|-------|-------|----------|
| README.md | 714 | Overview & Getting Started | Everyone |
| QUICK_REFERENCE.md | 473 | Fast Lookup | Users |
| AGENTS.md | 669 | Agent Deep-Dive | Implementers |
| ARCHITECTURE.md | 811 | System Design | Developers |
| CLI.md | 708 | Command Reference | Users |
| CONFIGURATION.md | 687 | Setup Guide | Users |
| EXAMPLES.md | 688 | Practical Use Cases | Users |
| API.md | 716 | Programmatic Access | Developers |
| TROUBLESHOOTING.md | 824 | Support & Fixes | Everyone |
| **TOTAL** | **6,290** | | |

## Quick Navigation

### I Want To...

**Get started quickly**
→ [README.md](../README.md) - "Quick Start" section

**Find a specific command**
→ [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - "Most Common Commands"

**Understand the 7 pillars**
→ [README.md](../README.md) - "7-Pillar Evaluation Methodology"

**Learn about agents**
→ [AGENTS.md](./AGENTS.md) - Full agent specifications

**Integrate into CI/CD**
→ [EXAMPLES.md](./EXAMPLES.md) - "CI/CD Integration"

**Configure for my setup**
→ [CONFIGURATION.md](./CONFIGURATION.md) - All options

**Fix an issue**
→ [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Search by error

**Use CodeWave programmatically**
→ [API.md](./API.md) - Complete API reference

**Understand the architecture**
→ [ARCHITECTURE.md](./ARCHITECTURE.md) - System design

**See practical examples**
→ [EXAMPLES.md](./EXAMPLES.md) - Real-world use cases

## Command Cheat Sheet

### Essential Commands

```bash
# Setup
codewave config              # Interactive configuration

# Evaluate
codewave evaluate HEAD       # Single commit
codewave batch-evaluate --count 50  # Multiple commits

# Manage Config
codewave config show         # View configuration
codewave config set model claude-3-5-sonnet-20241022  # Change setting

# Help
codewave --help              # General help
codewave evaluate --help     # Command help
```

## Document Navigation Flow

```
START HERE
    │
    ├─→ [README.md] Overview & Installation
    │       │
    │       ├─→ [QUICK_REFERENCE.md] Fast Lookup
    │       ├─→ [QUICK_REFERENCE.md] Common Commands
    │       └─→ [CLI.md] Full Command Reference
    │
    ├─→ [CONFIGURATION.md] Setup Your Environment
    │       │
    │       └─→ [TROUBLESHOOTING.md] If Issues Occur
    │
    ├─→ [EXAMPLES.md] Practical Tutorials
    │       │
    │       ├─→ CI/CD Integration
    │       ├─→ Team Workflows
    │       └─→ Data Analysis
    │
    ├─→ [AGENTS.md] Understand Agent System
    │       │
    │       └─→ [ARCHITECTURE.md] Deep Technical Dive
    │
    └─→ [API.md] Programmatic Usage
            │
            └─→ [ARCHITECTURE.md] System Design
```

## Feature Coverage

### By Document

| Feature | README | Quick Ref | CLI | Config | Examples | API | Agents | Architecture | Troubleshooting |
|---------|--------|-----------|-----|--------|----------|-----|--------|---------------|-----------------|
| Installation | ✓ | | | | | | | | ✓ |
| Quick Start | ✓ | | | | | | | | |
| Commands | ✓ | ✓ | ✓ | | ✓ | | | | |
| Configuration | ✓ | ✓ | ✓ | ✓ | | | | | ✓ |
| Agents | ✓ | ✓ | | | | | ✓ | ✓ | |
| Architecture | | | | | | | ✓ | ✓ | |
| CI/CD | | | | | ✓ | | | | |
| Examples | | | ✓ | | ✓ | ✓ | | | |
| Troubleshooting | | | | | | | | | ✓ |
| Scoring | ✓ | ✓ | | | | | | | |
| Evaluation | ✓ | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓ | ✓ |

## Learning Paths

### Path 1: User (2-3 hours)

1. Read [README.md](../README.md) - Overview (15 min)
2. Run [CONFIGURATION.md](./CONFIGURATION.md) - Setup (10 min)
3. Try examples from [EXAMPLES.md](./EXAMPLES.md) - Practice (1 hour)
4. Bookmark [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Reference

### Path 2: CI/CD Integration (1-2 hours)

1. Read [README.md](../README.md) - Overview (15 min)
2. Run [CONFIGURATION.md](./CONFIGURATION.md) - Setup (10 min)
3. Study [EXAMPLES.md](./EXAMPLES.md) - "CI/CD Integration" (30 min)
4. Implement in your pipeline (30-60 min)

### Path 3: Developer (4-6 hours)

1. Read [README.md](../README.md) - Overview (15 min)
2. Study [AGENTS.md](./AGENTS.md) - Agent system (45 min)
3. Review [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture (1 hour)
4. Explore [API.md](./API.md) - Programmatic API (45 min)
5. Review code structure and examples (1-2 hours)

### Path 4: Troubleshooting (30 min - 2 hours)

1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Find your issue
2. Try suggested solutions
3. Enable verbose: `codewave evaluate HEAD --verbose`
4. Collect debug info and report issue

## Search Tips

### By Error Message
Search [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for your error

### By Command
Search [CLI.md](./CLI.md) or [EXAMPLES.md](./EXAMPLES.md)

### By Concept
- **7-Pillars**: See [README.md](../README.md)
- **Agents**: See [AGENTS.md](./AGENTS.md)
- **Configuration**: See [CONFIGURATION.md](./CONFIGURATION.md)
- **Architecture**: See [ARCHITECTURE.md](./ARCHITECTURE.md)

## External Resources

### Official Links
- GitHub: https://github.com/techdebtgpt/codewave
- Issues: https://github.com/techdebtgpt/codewave/issues
- Discussions: https://github.com/techdebtgpt/codewave/discussions
- Website: https://techdebtgpt.com

### LLM Providers
- **Anthropic Claude**: https://console.anthropic.com
- **OpenAI GPT**: https://platform.openai.com
- **Google Gemini**: https://ai.google.dev

### Related Technologies
- **LangChain**: https://www.langchain.com/
- **LangGraph**: https://www.langchain.com/langgraph
- **Commander.js**: https://github.com/tj/commander.js

## Feedback & Contributions

- Report Issues: https://github.com/techdebtgpt/codewave/issues/new
- Suggest Improvements: https://github.com/techdebtgpt/codewave/discussions
- Contribute: See [README.md](../README.md) - "Contributing"

---

**Last Updated**: 2024-01-15
**Documentation Version**: 1.0.0
**CodeWave Version**: 1.0.0+

Total Lines of Documentation: **6,290**
Documents: **9**
Average Document Size: **699 lines**

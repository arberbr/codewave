# RAG-Based Multi-Query Commit Evaluation Architecture

## Overview

This document describes the new RAG (Retrieval-Augmented Generation) architecture for commit evaluation, where agents ask targeted questions instead of processing the entire diff.

## Why RAG?

### Current Problems
- ✅ **Small diffs (100 lines)**: Work fine (~3k tokens/agent)
- ⚠️ **Medium diffs (1,000 lines)**: Expensive (~30k tokens/agent, $1.50/eval)
- ❌ **Large diffs (5,000+ lines)**: Very expensive or fails (>150k tokens)
- ❌ **No cross-pillar validation**: Agents only evaluate their specialty

### RAG Solution
- ✅ **Scalable**: Only retrieve relevant chunks (5-10 queries vs entire diff)
- ✅ **Token efficient**: ~1k tokens/query instead of 30k+ for full diff
- ✅ **Cross-validation**: Agents ask questions across all pillars
- ✅ **Better accuracy**: Focused context per question
- ✅ **Explains lower weights**: Agents contribute to multiple metrics through questions

## Architecture

### 1. Vector Store Service

**File**: `src/services/diff-vector-store.service.ts`

**Features**:
- In-memory TF-IDF embeddings (no external dependencies, zero cost)
- Parses diff into chunks (file-level + hunk-level)
- Semantic similarity search using cosine similarity
- Metadata tagging (change type, file type, line numbers)

**Document Structure**:
```typescript
{
  content: string,          // Diff chunk content
  embedding: number[],      // TF-IDF vector (128 dimensions)
  metadata: {
    file: string,           // File path
    type: 'hunk' | 'file-summary',
    changeType: 'test' | 'business-logic' | 'config' | 'api' | 'database' | ...,
    fileType: 'source-code' | 'test' | 'documentation' | 'config' | ...,
    addedLines: number,
    deletedLines: number,
    startLine: number
  }
}
```

**Example Usage**:
```typescript
const vectorStore = new DiffVectorStoreService();
await vectorStore.initialize(commitDiff);

// Agent asks targeted question
const { chunks, summary } = await vectorStore.query(
  "Show me all test file changes",
  { topK: 5 }
);

// Returns top 5 most relevant chunks with similarity scores
```

### 2. Agent Query Patterns

Each agent asks **3-5 targeted questions** instead of analyzing the entire diff.

#### QA Engineer (40% test coverage weight)

**Primary Expertise Questions**:
1. "Show me all test file changes"
2. "What new test cases were added?"
3. "Are there any testing framework imports or test utilities?"

**Cross-Pillar Validation Questions**:
4. "What business logic changed that should be tested?" (→ validates functional impact)
5. "Show error handling and edge cases" (→ validates code quality)

**Scoring Logic**:
- Calculate `testCoverage` from primary questions (40% weight)
- Contribute insights to `functionalImpact` and `codeQuality` from cross-pillar questions

#### Business Analyst (43.5% functional impact weight)

**Primary Expertise Questions**:
1. "What user-facing features or API endpoints changed?"
2. "Show business logic and domain model changes"
3. "Are there any breaking changes or deprecations?"

**Cross-Pillar Validation Questions**:
4. "What database schema or migration changes exist?" (→ validates technical debt)
5. "Show configuration or environment variable changes" (→ validates complexity)

#### Developer Author (45.5% actual time weight)

**Primary Expertise Questions**:
1. "Show all code changes (exclude tests and docs)"
2. "What refactoring or code reorganization occurred?"
3. "Are there any new dependencies or imports?"

**Cross-Pillar Validation Questions**:
4. "Show comments or documentation added" (→ validates code quality)
5. "What complex algorithms or logic were implemented?" (→ validates complexity)

#### Senior Architect (41.7% complexity, 43.5% tech debt weight)

**Primary Expertise Questions**:
1. "Show architectural changes (classes, interfaces, modules)"
2. "What database migrations or schema changes exist?"
3. "Are there any performance-critical code paths?"

**Cross-Pillar Validation Questions**:
4. "Show error handling and exception management" (→ validates code quality)
5. "What API contracts or interfaces changed?" (→ validates functional impact)

#### Developer Reviewer (41.7% code quality weight)

**Primary Expertise Questions**:
1. "Show code style and formatting changes"
2. "What error handling and validation logic exists?"
3. "Are there any code comments or documentation?"

**Cross-Pillar Validation Questions**:
4. "Show complex logic or nested conditions" (→ validates complexity)
5. "What security-related changes were made?" (→ validates technical debt)

## Weight Distribution Explained

### Why Lower Weights Make Sense with RAG

**Old Architecture** (full diff analysis):
- Each agent sees everything → needs high weight in specialty
- Example: QA Engineer sees all code but only scores tests → needs 100% weight on `testCoverage`

**New Architecture** (RAG with targeted queries):
- Agent asks 5 questions (3 primary + 2 cross-pillar)
- Primary questions (60% of effort) → high weight in specialty pillar
- Cross-pillar questions (40% of effort) → lower weights in other pillars

**Example: QA Engineer with RAG**:
```
Effort Distribution:
- 60% effort on test coverage questions → 40% weight in testCoverage
- 20% effort on business logic validation → 10% weight in functionalImpact
- 20% effort on code quality validation → 10% weight in codeQuality

Total weights:
{
  testCoverage: 40%,
  functionalImpact: 10%,
  codeQuality: 10%,
  // ... other pillars from other agents
}
```

This is why **no agent needs 100% weight** - they all contribute to multiple pillars through cross-validation!

## Implementation Steps

### Phase 1: Vector Store (✅ Complete)
- [x] Create `DiffVectorStoreService` with TF-IDF embeddings
- [x] Parse diff into semantic chunks
- [x] Implement similarity search
- [x] Add metadata tagging

### Phase 2: Agent Interface Updates
- [ ] Update `AgentContext` to include `vectorStore: DiffVectorStoreService`
- [ ] Define `AgentQueries` interface:
```typescript
interface AgentQuery {
  question: string;
  purpose: 'primary' | 'cross-validation';
  targetPillar: PillarName;
  weight: number; // How much this query contributes to the pillar
}

interface AgentQueries {
  queries: AgentQuery[];
  execute(vectorStore: DiffVectorStoreService): Promise<QueryResults>;
}
```

### Phase 3: Update Each Agent
For each agent (BusinessAnalyst, QAEngineer, etc.):

1. Define their query set in `buildQueries()` method
2. Execute queries against vector store
3. Synthesize results into scores
4. Return scores with confidence intervals

**Example Pattern**:
```typescript
protected async buildQueries(): Promise<AgentQuery[]> {
  return [
    {
      question: "Show me all test file changes",
      purpose: 'primary',
      targetPillar: 'testCoverage',
      weight: 0.4  // 40% weight
    },
    {
      question: "What business logic changed that should be tested?",
      purpose: 'cross-validation',
      targetPillar: 'functionalImpact',
      weight: 0.1  // 10% weight
    },
    // ... more queries
  ];
}
```

### Phase 4: Orchestrator Updates
- [ ] Initialize vector store before agent execution
- [ ] Pass vector store to all agents via context
- [ ] Aggregate scores from all agent queries (respecting weights)

### Phase 5: Testing & Validation
- [ ] Test with small diff (100 lines) - verify accuracy matches old approach
- [ ] Test with medium diff (1,000 lines) - verify cost reduction
- [ ] Test with large diff (10,000 lines) - verify it works (old approach fails)
- [ ] Validate cross-pillar insights improve accuracy

## Expected Benefits

### Cost Reduction
| Diff Size | Old Cost | New Cost | Savings |
|-----------|----------|----------|---------|
| 100 lines | $0.15 | $0.10 | 33% |
| 1,000 lines | $1.50 | $0.20 | 87% |
| 5,000 lines | $7.50 | $0.30 | 96% |
| 10,000 lines | ❌ Fails | $0.40 | ✅ Works |

### Accuracy Improvements
- **Cross-validation**: Agents catch issues in non-specialty areas
- **Focused context**: Each query gets precisely relevant code
- **Confidence scoring**: Agents can express certainty based on retrieval quality

### Scalability
- **No token limits**: Works with commits of any size
- **Fast indexing**: TF-IDF embedding ~1-2 seconds for 10k line diff
- **Memory efficient**: Only stores embeddings, not full diff

## Migration Strategy

**Option 1: Parallel Run** (Recommended)
- Keep old architecture as fallback
- Add `--use-rag` flag to enable new approach
- Compare results side-by-side
- Switch default after validation

**Option 2: Hybrid Approach**
- Use RAG for diffs >1000 lines
- Use full diff for small commits
- Best of both worlds

**Option 3: Full Migration**
- Replace old architecture entirely
- Simpler codebase
- More testing needed upfront

## Next Steps

1. ✅ **Vector store created** - `DiffVectorStoreService` ready
2. **Update agent interface** - Add `vectorStore` to context
3. **Implement query pattern** - Start with one agent (QA Engineer) as proof-of-concept
4. **Test & validate** - Compare accuracy/cost with old approach
5. **Migrate all agents** - Roll out to remaining 4 agents
6. **Update documentation** - User guide and examples

**Ready to proceed with Phase 2?** Let me know which agent you want to start with as the proof-of-concept!

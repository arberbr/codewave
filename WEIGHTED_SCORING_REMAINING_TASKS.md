# Weighted Scoring Implementation - Remaining Tasks

## Completed ✅
1. Created `agent-weights.constants.ts` with normalized weights (sum to 1.0 per pillar)
2. Updated Business Analyst agent:
   - PRIMARY: functionalImpact (43.5%), idealTimeHours (41.7%)
   - Prompts updated to request all 7 scores
   - parseLLMResult expects all 7 metrics
3. Updated QA Engineer agent:
   - PRIMARY: testCoverage (40%)
   - Prompts updated to request all 7 scores
   - parseLLMResult expects all 7 metrics

## Remaining Tasks 🔄

### Task 1: Update Developer Author Agent
**Primary Expertise**: actualTimeHours (45.5%)
**File**: `src/agents/developer-author-agent.ts`

Changes needed:
- Update buildSystemPrompt() to include all 7 metrics scoring instructions
- Emphasize PRIMARY expertise: actualTimeHours (45.5%)
- Secondary: idealTimeHours (16.7%), codeComplexity (16.7%)
- Tertiary: Other metrics (9-13.6%)
- Update buildHumanPrompt() to request all 7 scores
- Update parseLLMResult() default metrics to include all 7

### Task 2: Update Senior Architect Agent  
**Primary Expertise**: codeComplexity (41.7%), technicalDebtHours (43.5%)
**File**: `src/agents/senior-architect-agent.ts`

Changes needed:
- Update buildSystemPrompt() to include all 7 metrics scoring instructions
- Emphasize PRIMARY expertise: codeComplexity (41.7%), technicalDebtHours (43.5%)
- Secondary: All other metrics (16-21%)
- Update buildHumanPrompt() to request all 7 scores
- Update parseLLMResult() default metrics to include all 7

### Task 3: Update Developer Reviewer Agent
**Primary Expertise**: codeQuality (41.7%)
**File**: `src/agents/developer-reviewer-agent.ts`

Changes needed:
- Update buildSystemPrompt() to include all 7 metrics scoring instructions
- Emphasize PRIMARY expertise: codeQuality (41.7%)
- Secondary: codeComplexity (20.8%), testCoverage (20%), technicalDebtHours (17.4%)
- Tertiary: Other metrics (12.5-13.6%)
- Update buildHumanPrompt() to request all 7 scores
- Update parseLLMResult() default metrics to include all 7

### Task 4: Implement Weighted Aggregation
**File**: `src/orchestrator/commit-evaluation-graph.ts`

Current code (lines ~275-295):
```typescript
const newPillarScores: Partial<PillarScores> = {};
for (const result of results) {
    if (result.metrics) {
        if (result.metrics.codeQuality !== undefined) {
            newPillarScores.codeQuality = result.metrics.codeQuality;
        }
        // ... simple assignment for each metric
    }
}
```

**Replace with**:
```typescript
import { calculateWeightedAverage } from '../constants/agent-weights.constants';

const newPillarScores: Partial<PillarScores> = {};

// Collect all agent scores for each pillar
const pillarScoresCollected: Record<string, Array<{agentName: string, score: number}>> = {
    functionalImpact: [],
    idealTimeHours: [],
    testCoverage: [],
    codeQuality: [],
    codeComplexity: [],
    actualTimeHours: [],
    technicalDebtHours: [],
};

for (const result of results) {
    const agentName = result.agentName || 'unknown';
    if (result.metrics) {
        if (result.metrics.functionalImpact !== undefined) {
            pillarScoresCollected.functionalImpact.push({
                agentName,
                score: result.metrics.functionalImpact
            });
        }
        // ... repeat for all 7 pillars
    }
}

// Calculate weighted averages
if (pillarScoresCollected.functionalImpact.length > 0) {
    newPillarScores.functionalImpact = calculateWeightedAverage(
        pillarScoresCollected.functionalImpact,
        'functionalImpact'
    );
}
// ... repeat for all 7 pillars
```

### Task 5: Update Metrics Table
**File**: `src/formatters/html-report-formatter-enhanced.ts`

Update `buildMetricsTable()` function to show:
- Agent name with weight percentage: `Business Analyst (43.5%)`
- Final agreed column shows weighted average formula
- Tooltip/note explaining weighted calculation

Example:
```html
<tr>
  <td>Functional Impact</td>
  <td>Business Analyst (43.5%): 8</td>
  <td>QA Engineer (13%): 7</td>
  <td>Dev Author (13%): 6</td>
  <td>Architect (17.4%): 7</td>
  <td>Reviewer (13%): 7</td>
  <td><strong>7.48</strong> (weighted avg)</td>
</tr>
```

### Task 6: Testing
1. Build: `npm run build`
2. Run evaluation: `node dist/cli/index.js evaluate test-commit.diff`
3. Verify:
   - All agents return all 7 scores (check results.json)
   - Weighted averages calculated correctly
   - HTML report shows weights and proper calculations
   - Primary expertise agents dominate their pillars (~40-45% influence)

## Weight Summary Table

| Pillar | Business Analyst | QA Engineer | Dev Author | Senior Architect | Dev Reviewer | Sum |
|--------|------------------|-------------|------------|------------------|--------------|-----|
| functionalImpact | **43.5%** | 13% | 13% | 17.4% | 13% | 100% |
| idealTimeHours | **41.7%** | 8.3% | 16.7% | 20.8% | 12.5% | 100% |
| testCoverage | 12% | **40%** | 12% | 16% | 20% | 100% |
| codeQuality | 8.3% | 16.7% | 12.5% | 20.8% | **41.7%** | 100% |
| codeComplexity | 8.3% | 12.5% | 16.7% | **41.7%** | 20.8% | 100% |
| actualTimeHours | 13.6% | 9.1% | **45.5%** | 18.2% | 13.6% | 100% |
| technicalDebtHours | 13% | 13% | 13% | **43.5%** | 17.4% | 100% |

**Bold** = Primary expertise (highest weight per pillar)

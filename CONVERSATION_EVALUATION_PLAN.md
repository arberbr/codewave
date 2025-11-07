# Multi-Agent Conversation-Based Commit Evaluation - Implementation Plan

## 🎯 Overview

Transform the commit evaluator into a conversation-based system where 5 specialized agents discuss the commit across 7 evaluation pillars.

## 👥 Agent Roles & Responsibilities

### 1. QA Engineer
- **Focus**: Test coverage, quality assurance, edge cases
- **Metrics**: 
  - Test Coverage (1-10)
- **Conversation Style**: Questions about testing strategy, identifies gaps

### 2. Developer (Commit Author)
- **Focus**: Implementation decisions, actual time spent
- **Metrics**:
  - Actual Time Estimation (hours)
- **Conversation Style**: Explains implementation choices, defends decisions

### 3. Senior Architect
- **Focus**: Architecture, design patterns, code complexity
- **Metrics**:
  - Code Complexity (10-1, lower is better)
  - Technical Debt (hours, +/- based on introduced/reduced)
- **Conversation Style**: Evaluates architectural impact, suggests improvements

### 4. Developer Reviewer
- **Focus**: Code quality, maintainability
- **Metrics**:
  - Code Quality (1-10)
- **Conversation Style**: Nitpicks code style, suggests refactorings

### 5. Business Analyst
- **Focus**: Functional impact, business value, requirements
- **Metrics**:
  - Functional Impact (1-10)
  - Ideal Time Estimation (hours - without seeing implementation)
- **Conversation Style**: Questions business value, validates requirements

## 📊 7 Evaluation Pillars

| Pillar | Scale | Best | Worst | Owner |
|--------|-------|------|-------|-------|
| Code Quality | 1-10 | 10 | 1 | Developer Reviewer |
| Code Complexity | 10-1 | 1 | 10 | Senior Architect |
| Ideal Time | hours | - | - | Business Analyst |
| Actual Time | hours | - | - | Developer (Author) |
| Technical Debt | hours | negative (reduced) | positive (added) | Senior Architect |
| Functional Impact | 1-10 | 10 | 1 | Business Analyst |
| Test Coverage | 1-10 | 10 | 1 | QA Engineer |

## 🔄 Conversation Flow (LangGraph Orchestration)

```
START
  ↓
Round 1: Initial Analysis (Parallel)
  ├── Business Analyst analyzes requirements → Ideal Time, Functional Impact
  ├── QA Engineer reviews testing → Test Coverage
  ├── Developer explains implementation → Actual Time
  ├── Senior Architect evaluates design → Complexity, Tech Debt
  └── Developer Reviewer checks quality → Code Quality
  ↓
checkConsensus() → converged?
  ↓ No (continue discussion)
Round 2: Cross-Agent Discussion (Sequential with context)
  ├── Business Analyst responds to concerns
  ├── QA Engineer addresses testing gaps
  ├── Developer defends/adjusts estimates
  ├── Senior Architect refines complexity assessment
  └── Developer Reviewer finalizes quality score
  ↓
checkConsensus() → converged?
  ↓ Yes or Max Rounds
aggregateScores()
  ↓
generateConversationTranscript()
  ↓
END
```

## 📝 Output Format

### 1. Conversation Transcript
```markdown
# Commit Evaluation Discussion

## Round 1: Initial Analysis

### Business Analyst
[Conversation-style analysis]
- **Functional Impact**: 7/10
- **Ideal Time Estimation**: 8 hours

### QA Engineer
[Conversation-style feedback]
- **Test Coverage**: 3/10

### Developer (Author)
[Implementation explanation]
- **Actual Time Estimation**: 12 hours

### Senior Architect
[Architecture review]
- **Code Complexity**: 6/10 (moderate complexity)
- **Technical Debt**: +4 hours (introduced)

### Developer Reviewer
[Code quality feedback]
- **Code Quality**: 6/10

---

## Round 2: Discussion & Refinement

[Agents respond to each other's concerns...]

---

## Final Scores

| Pillar | Score | Notes |
|--------|-------|-------|
| Code Quality | 6/10 | Adequate but needs refactoring |
| Code Complexity | 6/10 | Moderate complexity, consider simplifying |
| Ideal Time | 8h | Based on requirements |
| Actual Time | 12h | 50% over estimate |
| Technical Debt | +4h | Shortcuts taken, needs followup |
| Functional Impact | 7/10 | Good feature delivery |
| Test Coverage | 3/10 | Missing edge case tests |

### Summary
The implementation delivers good functional value but at the cost of increased complexity and technical debt. Test coverage is insufficient and should be improved before merging.
```

### 2. JSON Output (for programmatic access)
```json
{
  "conversation": [
    {
      "round": 1,
      "agent": "business-analyst",
      "role": "Business Analyst",
      "message": "...",
      "metrics": {
        "functionalImpact": 7,
        "idealTime": 8
      }
    },
    // ... all messages
  ],
  "finalScores": {
    "codeQuality": 6,
    "codeComplexity": 6,
    "idealTime": 8,
    "actualTime": 12,
    "technicalDebt": 4,
    "functionalImpact": 7,
    "testCoverage": 3
  },
  "summary": "..."
}
```

## 🏗️ Implementation Steps

### Phase 1: Agent Updates ✅
1. ✅ Create BusinessAnalystAgent (functional impact, ideal time)
2. ⏳ Update QAEngineerAgent (add test coverage scoring)
3. ⏳ Create DeveloperAuthorAgent (actual time, implementation explanation)
4. ⏳ Create SeniorArchitectAgent (complexity, technical debt)
5. ⏳ Update existing agents to use conversation style

### Phase 2: LangGraph Orchestration ⏳
1. Update CommitEvaluationState to include:
   - `conversationHistory[]` - all agent messages
   - `currentPillarScores{}` - evolving scores per round
   - `consensusReached: boolean`
2. Create conversation nodes:
   - `initialAnalysis` - all agents analyze in parallel
   - `crossAgentDiscussion` - agents respond to each other
   - `checkConsensus` - determine if scores have stabilized
   - `aggregateScores` - finalize all metrics
3. Update conditional edges for consensus-based stopping

### Phase 3: Output Formatting ⏳
1. Create ConversationTranscriptFormatter
2. Update HTML report to show conversation flow
3. Create timeline visualization of discussion
4. Add metric evolution charts (scores across rounds)

### Phase 4: Scoring System ⏳
1. Implement metric validation (1-10, 10-1, hours)
2. Add consensus detection (score stability across rounds)
3. Create aggregation logic with confidence intervals

## 🎨 Enhanced HTML Report Structure

```html
<div class="evaluation-report">
  <header>
    <h1>Commit Evaluation Discussion</h1>
    <div class="commit-info">
      <span>Commit: a1b2c3d4</span>
      <span>Participants: 5 agents</span>
      <span>Rounds: 2</span>
    </div>
  </header>

  <section class="final-scores-dashboard">
    <!-- Visual dashboard with gauges and charts -->
  </section>

  <section class="conversation-timeline">
    <div class="round" data-round="1">
      <h2>Round 1: Initial Analysis</h2>
      <div class="agent-message" data-agent="business-analyst">
        <div class="agent-avatar">👔</div>
        <div class="message-content">...</div>
        <div class="metrics-badge">
          <span>Functional Impact: 7/10</span>
          <span>Ideal Time: 8h</span>
        </div>
      </div>
      <!-- More agent messages -->
    </div>

    <div class="round" data-round="2">
      <h2>Round 2: Discussion</h2>
      <!-- Cross-agent responses -->
    </div>
  </section>

  <section class="score-evolution">
    <!-- Charts showing how scores changed across rounds -->
  </section>

  <section class="final-recommendations">
    <!-- Aggregated recommendations from all agents -->
  </section>
</div>
```

## 🔧 Configuration

Add to `.commit-evaluator.config.json`:
```json
{
  "evaluation": {
    "conversationRounds": 2,
    "consensusThreshold": 0.9,
    "agents": {
      "businessAnalyst": { "enabled": true },
      "qaEngineer": { "enabled": true },
      "developerAuthor": { "enabled": true },
      "seniorArchitect": { "enabled": true },
      "developerReviewer": { "enabled": true }
    },
    "pillars": {
      "codeQuality": { "weight": 1.0 },
      "codeComplexity": { "weight": 1.0, "inverted": true },
      "idealTime": { "weight": 0.5 },
      "actualTime": { "weight": 0.5 },
      "technicalDebt": { "weight": 1.5 },
      "functionalImpact": { "weight": 1.2 },
      "testCoverage": { "weight": 1.0 }
    }
  }
}
```

## 📐 Success Criteria

- [x] 5 distinct agent personalities with clear roles
- [ ] Conversation flows naturally across rounds
- [ ] Each pillar has clear ownership and scoring
- [ ] Scores converge or stabilize across rounds
- [ ] HTML report shows full conversation transcript
- [ ] JSON output includes all messages and scores
- [ ] Code complexity uses inverted scale (1=best, 10=worst)
- [ ] Technical debt shows +/- hours correctly

## 🚀 Next Steps

1. Shall I proceed with implementing all 5 agents?
2. Update the LangGraph orchestration for conversation flow?
3. Create the conversation transcript formatter?

Let me know which phase you'd like to tackle first!

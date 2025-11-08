# CodeWave HTML Report Guide

Complete guide to understanding and using CodeWave's interactive HTML reports.

## Overview

CodeWave generates interactive HTML reports that visualize code quality evaluations through multiple perspectives. The report includes:

- **7-Pillar Summary**: Key metrics at a glance
- **Developer Overview**: AI-generated summary of changes
- **Conversation Timeline**: Multi-agent discussion flow
- **Evaluation History**: Metric trends across multiple evaluations
- **Agent Details**: Individual assessments from each agent

---

## Report Structure

### 1. Header Section

**What You See:**
- Repository name and commit information
- Commit hash (clickable, first 8 chars)
- Author name
- Commit date and time
- Original commit message

**Why It Matters:**
Provides quick context about which commit is being evaluated.

---

### 2. Developer Overview Card

**What It Shows:**
AI-generated summary of the commit, created by analyzing the diff before agents evaluate:

- **Summary**: One-line executive summary (max 150 chars)
- **Details**: Paragraph explaining key changes (max 400 chars)
- **Key Changes**: Bullet list of implementation details

**When It Appears:**
- Always visible in the report
- Shows "Overview generation failed" if there was an issue

**Why It Matters:**
Gives you quick understanding of what changed without reading the full diff. The overview is created automatically as part of the evaluation pipeline.

**Example:**
```
Summary: Added actual estimation as a separate step

Details: Introduced actual time estimation alongside ideal time in PR analysis
for better accuracy.

Key Changes:
- Implemented IActualTimeEstimator interface
- Created ActualTimeRunnable for estimation
- Merged actual time with PR lifecycle data
```

---

### 3. 7-Pillar Summary Cards

**The Seven Dimensions:**

#### Code Quality (1-10)
- Measures: Correctness, design patterns, readability, maintainability
- Assessed by: Developer Reviewer 🔍
- **Green (8-10):** Production-ready, exemplary code
- **Yellow (5-7):** Acceptable, minor improvements possible
- **Red (1-4):** Problematic, significant issues

#### Complexity (1-10, reversed scale)
- Measures: Cognitive load, architectural simplicity
- Assessed by: Senior Architect 🏛️
- Note: **Lower is better** (10=simple, 1=complex)
- **Green (8-10):** Simple, easy to understand
- **Yellow (5-7):** Moderate complexity
- **Red (1-4):** High complexity, refactoring needed

#### Ideal Time (Hours)
- Measures: Perfect-case time to implement
- Assessed by: Business Analyst 🎯
- Assumptions: No surprises, straightforward requirements
- Used for: Project planning, capacity estimation

#### Actual Time (Hours)
- Measures: Real time developer spent
- Assessed by: Developer Author 👨‍💻
- Includes: Coding, debugging, testing, deployment
- Used for: Understanding true effort

#### Technical Debt (Hours)
- Measures: Debt added (positive) or removed (negative)
- Assessed by: Senior Architect 🏛️
- **Green (+):** Debt removed, code health improved
- **Red (-):** Debt added, technical liabilities created
- Used for: Tracking quality trends

#### Functional Impact (1-10)
- Measures: Business/user value delivered
- Assessed by: Business Analyst 🎯
- **High (8-10):** Significant impact, worth prioritizing
- **Medium (5-7):** Noticeable value, business-relevant
- **Low (1-4):** Minimal impact, nice-to-have

#### Test Coverage (1-10)
- Measures: Test comprehensiveness and quality
- Assessed by: SDET 🧪 (Software Development Engineer in Test)
- **Green (8-10):** Comprehensive, all scenarios tested
- **Yellow (5-7):** Good coverage, minor gaps
- **Red (1-4):** Sparse coverage, many untested paths

**Color Coding:**
- 🟢 Green: 7-10 (Excellent/High)
- 🟡 Yellow: 5-6 (Acceptable/Moderate)
- 🔴 Red: 1-4 (Poor/Low)

---

### 4. Conversation Timeline

**What It Shows:**
The multi-round discussion between agents evaluating the commit.

**How It Works:**
1. **Round 1 - Initial Assessment**: Each agent provides initial evaluation
2. **Round 2 - Concerns**: Agents raise concerns about others' assessments
3. **Round 3 - Validation**: Final refinements and consensus-building

**Why Multiple Rounds?**
Different agents have different expertise. By discussing their findings:
- Architects catch design issues developers might miss
- Developers catch test gaps QA engineers noted
- Analysts ensure business value aligns with implementation complexity

**What to Look For:**
- **Consensus**: When agents mostly agree on scores
- **Disagreements**: Different perspectives highlight nuanced issues
- **Reasoning**: Why each agent scored differently

**Example Timeline Entry:**
```
[Round 1] Business Analyst 🎯
Summary: The commit adds valuable estimation features with clear business value
Details: Improves PR analysis accuracy for better resource planning
Scores: Impact=8, Ideal Time=8 hours

[Round 2] Senior Architect 🏛️
Concern: Complexity score seems low for new interface integrations
Revised: Complexity=6 (was 5), Tech Debt=2 (architectural coupling)

[Round 3] All Agents
Consensus: Feature valuable, minor architectural concerns noted
Final: Code Quality=7, Impact=8, Tech Debt=2 hours
```

---

### 5. Evaluation History Tab

**What It Shows:**
Trends across multiple evaluations of the same commit.

**Key Components:**

#### Convergence Score
- **Range:** 0.0 - 1.0 (higher is better)
- **Meaning:** How close agent evaluations are to consensus
  - **0.9+**: Strong consensus, reliable evaluation
  - **0.7-0.8**: Good consensus, minor disagreements
  - **0.5-0.6**: Moderate disagreement, investigate outliers
  - **<0.5**: Low consensus, metrics need review

#### Metric Evolution
Shows how each metric changed between evaluations:

- **Baseline:** First evaluation (starting point)
- **Change Indicators:**
  - 🟢 Green arrow down: Improvement (lower is better for complexity/debt)
  - 🔴 Red arrow up: Degradation (higher is worse)
  - ▬ Flat: No change

#### Change Calculations
```
Example: Code Quality trend
Eval #1: 6.2
Eval #2: 6.4 (+3% change, +0.2 improvement)
Eval #3: 5.8 (-9% change, -0.6 degradation)
```

**When to Use:**
1. **Multiple evaluations:** Run evaluation multiple times to verify stability
2. **Understand variability:** See if metrics are consistent
3. **Track trends:** Monitor if a commit gets re-evaluated

---

### 6. Agent Details Tabs

**Five Perspectives:**

#### Business Analyst 🎯
**Role**: Evaluates business value and feasibility

**Metrics**:
- Functional Impact (1-10): How much user/business value?
- Ideal Time (hours): Perfect-case estimate

**Questions Asked**:
- What is the business value of this change?
- Does this align with product roadmap?
- Are requirements clear?

**What to Look For**:
- Concerns about scope creep or unclear requirements
- Questions about user impact

---

#### Developer Author 👨‍💻
**Role**: Developer who implemented the change

**Metrics**:
- Actual Time (hours): Time really spent
- Tech Debt (hours): Debt added/removed

**Questions Asked**:
- How long did this actually take?
- What challenges were encountered?
- Is the implementation maintainable?

**What to Look For**:
- If actual time >> ideal time, indicates complexity
- Technical debt insights from the implementer

---

#### Developer Reviewer 🔍
**Role**: Code quality specialist

**Metrics**:
- Code Quality (1-10): Correctness, design, readability
- Test Coverage (conceptual): Are tests adequate?

**Questions Asked**:
- Does this code work correctly?
- Are there design improvements?
- Is it readable and maintainable?

**What to Look For**:
- Specific code quality concerns
- Suggestions for improvement

---

#### Senior Architect 🏛️
**Role**: System design and technical debt expert

**Metrics**:
- Complexity (1-10): Architectural simplicity
- Technical Debt (hours): Long-term liabilities

**Questions Asked**:
- Is this design scalable?
- Does it follow SOLID principles?
- What technical debt is introduced?

**What to Look For**:
- Architectural concerns
- Design pattern recommendations
- Technical debt warnings

---

#### SDET 🧪
**Role**: Software Development Engineer in Test

**Metrics**:
- Test Coverage (1-10): Comprehensiveness
- Quality (conceptual): Test automation quality

**Questions Asked**:
- Are we confident this works?
- What scenarios aren't tested?
- Is test code maintainable?

**What to Look For**:
- Test coverage gaps
- Edge cases that aren't covered

---

## How to Read the Report

### Quick Review (2 minutes)
1. Read **Developer Overview** for context
2. Check **7-Pillar Summary** cards for overall health
3. Scan **Conversation Timeline** for major concerns

### Detailed Review (5 minutes)
1. Review each **Agent Details** tab
2. Pay attention to **disagreements** between agents
3. Check **Evaluation History** for convergence

### Quality Gate Analysis (10 minutes)
1. Verify all pillars meet team standards
2. Check for technical debt warnings
3. Review test coverage recommendations
4. Confirm business impact aligns with effort

---

## Common Patterns

### Pattern 1: High Impact, Low Complexity
```
✅ Good scenario:
- Impact: 8-10 (high value)
- Complexity: 8-10 (simple, 10 on reversed scale)
- This is a "win" - high value, easy to implement
```

### Pattern 2: High Complexity, Low Impact
```
⚠️  Red flag:
- Impact: 3-4 (low value)
- Complexity: 1-3 (complex, 1-3 on reversed scale)
- Consider: Is this worth the effort? Could it be simplified?
```

### Pattern 3: Actual Time >> Ideal Time
```
📊 Investigation needed:
- Ideal: 4 hours
- Actual: 12 hours (3x more)
- Could indicate: Unclear requirements, unexpected complexity, or debugging challenges
- Read Developer Author's details for context
```

### Pattern 4: High Technical Debt
```
🚨 Track this:
- Tech Debt: +5 hours
- This indicates architectural concerns
- Consider: Follow-up PR to address, or plan refactoring
```

---

## Interpreting Disagreements

### When Agents Disagree

**Normal**: Agents often have different perspectives - this is valuable!

**Architect thinks complexity is high, Developer Reviewer thinks code quality is good**
- Interpretation: Code is well-written but does complex things
- Action: Monitor for maintainability issues

**Test Coverage is low, but Analyst thinks Impact is high**
- Interpretation: Important feature with risky implementation
- Action: Prioritize adding tests

**Actual time is much higher than ideal time**
- Interpretation: Requirements were unclear or tricky to implement
- Action: Document lessons learned

---

## Exporting and Sharing

### Share the Report
- **Best for stakeholders**: Open the HTML file in browser and share the link
- **Best for CI/CD**: Use `results.json` programmatically

### Using results.json
```javascript
// Load in script
const results = JSON.parse(fs.readFileSync('results.json', 'utf-8'));

// Access metrics
console.log(results.agents[0].metrics.codeQuality);
console.log(results.developers.overview);
console.log(results.timestamp);
```

### Creating Custom Reports
```bash
# Extract just the metrics
jq '.agents[] | {role: .agentRole, metrics: .metrics}' results.json

# Get convergence score
jq '.convergenceScore' results.json

# Find all high-impact commits
for file in .evaluated-commits/*/results.json; do
  impact=$(jq '.agents[0].metrics.functionalImpact' "$file")
  if (( $(echo "$impact > 8" | bc -l) )); then
    echo "High impact: $file"
  fi
done
```

---

## Performance Notes

### Report Load Time
- Typical: < 1 second
- Large diffs (>100KB): 2-5 seconds
- Slow machine: May need to wait for evaluation to complete

### Browser Compatibility
- **Recommended**: Chrome, Firefox, Safari (latest)
- **Supported**: Edge, any modern browser with ES6 support
- **Not supported**: IE11

### File Size
- Typical HTML: 150-300 KB
- Includes: Embedded charts, full agent discussion
- Storage: Keep for audit trail

---

## Tips and Tricks

### Tip 1: Keyboard Navigation
- Tab: Move between sections
- Scroll: Navigate timeline
- Click agent names: Jump to their evaluation

### Tip 2: Exporting Metrics
```bash
# Create CSV from multiple evaluations
echo "Commit,Quality,Impact,Complexity,TestCoverage" > metrics.csv
for file in .evaluated-commits/*/results.json; do
  commit=$(jq -r '.metadata.commitHash' "$file" | cut -c1-8)
  quality=$(jq '.agents[0].metrics.codeQuality' "$file")
  impact=$(jq '.agents[0].metrics.functionalImpact' "$file")
  complexity=$(jq '.agents[0].metrics.codeComplexity' "$file")
  tests=$(jq '.agents[1].metrics.testCoverage' "$file")
  echo "$commit,$quality,$impact,$complexity,$tests" >> metrics.csv
done
```

### Tip 3: Team Metrics Dashboard
```bash
# Calculate team average
jq -s '[.[].agents[0].metrics.codeQuality] | add/length' \
  .evaluated-commits/*/results.json
```

### Tip 4: Finding Problem Commits
```bash
# Find all commits with low code quality
jq -r 'select(.agents[0].metrics.codeQuality < 5) | .metadata.commitHash' \
  .evaluated-commits/*/results.json
```

---

## Troubleshooting

### Report Shows "N/A" Values
**Cause**: Evaluation didn't complete or metrics weren't generated

**Solution**:
1. Check browser console for errors (F12)
2. Verify results.json is complete
3. Re-run evaluation if necessary

### Page Won't Load in Browser
**Cause**: Large file or browser memory issue

**Solution**:
1. Try different browser
2. Close other tabs
3. Check file is valid HTML (not corrupted)

### Missing Developer Overview
**Cause**: Generation failed or not saved

**Solution**:
1. Check `.evaluated-commits/*/results.json`
2. Look for error in console logs (if verbose mode enabled)
3. Re-run evaluation

### Charts Not Displaying
**Cause**: JavaScript disabled or file not found

**Solution**:
1. Enable JavaScript in browser
2. Ensure CSS/chart libraries loaded
3. Check browser developer console (F12)

---

## Next Steps

- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Fast commands and scoring guide
- **[AGENTS.md](./AGENTS.md)** - Deep dive into agent system
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical implementation details
- **[CLI.md](./CLI.md)** - Command line reference

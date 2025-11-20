# CodeWave Database & Web Integration Summary

## Overview

This document summarizes the complete plan for integrating PostgreSQL database storage and Next.js web visualization into CodeWave, replacing the current ZIP file Slack notifications with shareable web links.

## Current State

✅ **Working:**
- HTML report generation (local files)
- Multi-agent evaluation system
- 7-Pillar metrics calculation
- Conversation tracking
- Token usage tracking
- Slack ZIP file uploads

❌ **Not Working:**
- Database storage and sync
- Web-based visualization
- Shareable links

## Goals

1. **Database Integration**: Save all evaluation data to PostgreSQL
2. **Web Visualization**: Next.js app to display evaluations
3. **Shareable Links**: Generate `<DOMAIN>/<USERNAME_REPO_NAME>/` URLs
4. **Slack Integration**: Send links instead of ZIP files

## Architecture Overview

```
┌─────────────────┐
│  CodeWave CLI   │
│  (Evaluation)   │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌──────────────┐   ┌──────────────┐
│ Local Files  │   │  PostgreSQL  │
│ (HTML, JSON) │   │   Database   │
└──────────────┘   └──────┬───────┘
                          │
                          ▼
                   ┌──────────────┐
                   │  Next.js App │
                   │  (Web UI)    │
                   └──────┬───────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   Slack      │
                   │  (Links)     │
                   └──────────────┘
```

## Implementation Plan

### Phase 1: Database Schema & Integration

**Files to Create/Modify:**
- `DATABASE_SCHEMA_PLAN.md` ✅ (Created - using Prisma)
- `prisma/schema.prisma` (NEW - Prisma schema file)
- `src/services/database.service.ts` (NEW - Prisma Client wrapper)
- `src/config/config.interface.ts` (MODIFY - add database config)
- `src/config/default-config.ts` (MODIFY - add database defaults)
- `cli/commands/config.command.ts` (MODIFY - add database setup)
- `cli/utils/shared.utils.ts` (MODIFY - add database save logic)

**Key Tasks:**
1. Create Prisma schema (11 models) in `prisma/schema.prisma`
2. Install Prisma: `npm install prisma @prisma/client`
3. Create database service (`src/services/database.service.ts`) with automatic schema application
4. Integrate automatic setup into config command - schema applies when user enters connection string
5. Generate Prisma Client automatically after schema application
6. Create database service wrapper for data operations
7. Add database configuration to CLI config
8. Integrate database saves alongside file saves
9. Make database optional (fallback to file-only if not configured)
10. Show confirmation message when schema is successfully applied

**Database Tables:**
- `repositories` - Repository metadata
- `commits` - Commit information
- `evaluations` - Evaluation runs
- `agent_results` - Agent evaluation results
- `agent_metrics` - Metrics per agent
- `consensus_metrics` - Final consensus scores
- `token_usage` - Token tracking
- `agent_token_usage` - Per-agent token usage
- `conversation_messages` - Conversation history
- `agent_concerns` - Concerns tracking
- `evaluation_history` - Historical snapshots

### Phase 2: Repository Identification

**Challenge**: Extract `username/repo_name` from git repository.

**Solution Options:**
1. **Git Remote Parsing** (Recommended)
   ```typescript
   // Parse from: git@github.com:username/repo.git
   // or: https://github.com/username/repo.git
   const remote = await exec('git remote get-url origin');
   const match = remote.match(/(?:github\.com|gitlab\.com)[\/:]([\w-]+)\/([\w-]+)/);
   ```

2. **Config File**
   ```typescript
   // Allow manual configuration in .codewave.config.json
   {
     "repository": {
       "username": "techdebtgpt",
       "repo_name": "codewave"
     }
   }
   ```

3. **Fallback**
   ```typescript
   // Use directory name if git remote not available
   const repoName = path.basename(process.cwd());
   const username = process.env.USER || 'unknown';
   ```

**Implementation:**
- Add repository detection utility
- Store in database on first evaluation
- Use for URL generation

### Phase 3: Next.js Application

**Files to Create:**
- `NEXTJS_APP_PLAN.md` ✅ (Created)
- New Next.js project structure
- Database query functions
- API routes
- React components

**Key Features:**
- Repository overview page
- Commit evaluation pages
- Agent timeline visualization
- Metrics tables
- Conversation views
- Evaluation history

**URL Structure:**
- `/<username>/<repo>/` - Repository overview
- `/<username>/<repo>/<commitHash>` - Latest evaluation
- `/<username>/<repo>/<commitHash>/<evaluationNumber>` - Specific evaluation

### Phase 4: Slack Integration Update

**Current**: Sends ZIP file to Slack
**New**: Send shareable link to Slack

**Changes Needed:**
- Modify `src/services/slack.service.ts`
- Add `sendEvaluationLink()` method
- Update `cli/commands/evaluate-command.ts` and `batch-evaluate-command.ts`
- Generate link: `<DOMAIN>/<USERNAME_REPO_NAME>/<COMMIT_HASH>`

**Slack Message Format:**
```
📊 CodeWave Evaluation Results
Commit: `abc12345`
Message: Fix bug in authentication

View full report: https://codewave.example.com/techdebtgpt/codewave/abc12345
```

## Configuration

### Database Configuration

Add to `.codewave.config.json`:
```json
{
  "database": {
    "enabled": true,
    "host": "localhost",
    "port": 5432,
    "database": "codewave",
    "username": "postgres",
    "password": "password",
    "ssl": false
  }
}
```

### Web App Configuration

Environment variables for Next.js app:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=codewave
DB_USER=postgres
DB_PASSWORD=password
NEXT_PUBLIC_DOMAIN_NAME=codewave.example.com
```

## Data Flow

### Evaluation Flow

1. **CLI runs evaluation**
   - Analyzes commit
   - Generates agent results
   - Calculates metrics

2. **Save to local files** (existing)
   - HTML report
   - JSON results
   - Conversation transcript
   - etc.

3. **Save to database** (NEW)
   - Detect/create repository record
   - Create/update commit record
   - Create evaluation record
   - Store agent results
   - Store metrics
   - Store conversation history

4. **Generate shareable link** (NEW)
   - Format: `<DOMAIN>/<USERNAME_REPO_NAME>/<COMMIT_HASH>`
   - Link points to latest evaluation

5. **Send to Slack** (MODIFIED)
   - Send link to evaluation
   - Send repository password (grants access to all repo evaluations)
   - Include commit metadata in message

### Web App Flow

1. **User visits URL**
   - Parse `<username>/<repo>/<commitHash>`
   - Query database for repository
   - Query database for commit
   - Query database for latest evaluation

2. **Render evaluation**
   - Fetch all related data (agents, metrics, conversation)
   - Render using same components as local HTML
   - Display in browser

## Questions & Clarifications Needed

### 1. Repository Identification
- **Q**: How should we handle repositories without git remotes?
- **A**: Use config file or directory name as fallback

### 2. Domain Name
- **Q**: What will be the domain name for the Next.js app?
- **A**: Needs to be configured (e.g., `codewave.example.com`)

### 3. Database Hosting
- **Q**: Where will PostgreSQL be hosted? (Local, cloud, managed service?)
- **A**: Should be configurable in config file

### 4. Multi-Tenancy
- **Q**: Should the system support multiple users/organizations?
- **A**: Initial plan assumes single database, can add authentication later

### 5. Existing Data Migration
- **Q**: Should we migrate existing local evaluations to database?
- **A**: Can create migration utility in Phase 2

### 6. URL Format
- **Q**: Should URLs be case-sensitive?
- **A**: Recommend lowercase for consistency (e.g., `techdebtgpt/codewave`)

### 7. Evaluation Numbering
- **Q**: How should we handle evaluation numbers when deleting old evaluations?
- **A**: Use auto-incrementing, don't reuse numbers

### 8. Diff Storage
- **Q**: Should we store full diffs in database or reference files?
- **A**: Store in database with compression for small diffs, external storage for large ones

## Next Steps

1. **Review Plans**: Review `DATABASE_SCHEMA_PLAN.md` and `NEXTJS_APP_PLAN.md`
2. **Clarify Questions**: Answer questions above
3. **Start Implementation**: Begin with Phase 1 (Database Integration)
4. **Iterate**: Build incrementally, test each phase

## Dependencies

### For Database Integration
- `prisma` - Prisma ORM (dev dependency)
- `@prisma/client` - Prisma Client for database access
- Prisma handles migrations automatically

### For Next.js App
- `next` - Next.js framework
- `react` - React library
- `react-dom` - React DOM
- `prisma` - Prisma ORM (dev dependency)
- `@prisma/client` - Prisma Client
- `tailwindcss` - Styling (optional, can use Bootstrap only)
- `@types/node` - TypeScript types

## Timeline Estimate

- **Phase 1 (Database)**: 2-3 days
- **Phase 2 (Repository ID)**: 1 day
- **Phase 3 (Next.js App)**: 5-7 days
- **Phase 4 (Slack Update)**: 1 day
- **Testing & Polish**: 2-3 days

**Total**: ~2 weeks for complete implementation


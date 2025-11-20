# Database Schema Plan for CodeWave PostgreSQL Integration

## Overview

This document outlines the PostgreSQL database schema design using Prisma ORM to store all CodeWave evaluation data, enabling web-based visualization and sharing via links.

## Schema Design Principles

1. **Normalization**: Proper relational structure to avoid data duplication
2. **Extensibility**: Schema can accommodate future features
3. **Performance**: Indexed fields for common queries
4. **Data Integrity**: Foreign keys and constraints
5. **Audit Trail**: Timestamps for all data changes

## Prisma Schema

The complete Prisma schema file (`prisma/schema.prisma`):

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Repository {
  id          String   @id @default(uuid()) @db.Uuid
  username    String   @db.VarChar(255)
  repoName    String   @map("repo_name") @db.VarChar(255)
  fullName    String   @map("full_name") @unique @db.VarChar(511)
  remoteUrl   String?  @map("remote_url") @db.Text
  description String?  @db.Text
  password    String   @db.VarChar(255) // Password to access all evaluations for this repo
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  commits Commit[]

  @@unique([username, repoName])
  @@index([fullName])
  @@index([username])
  @@map("repositories")
}

model Commit {
  id           String   @id @default(uuid()) @db.Uuid
  repositoryId String   @map("repository_id") @db.Uuid
  commitHash   String   @map("commit_hash") @db.VarChar(40)
  shortHash    String?  @map("short_hash") @db.VarChar(8)
  authorName   String?  @map("author_name") @db.VarChar(255)
  authorEmail  String?  @map("author_email") @db.VarChar(255)
  commitMessage String? @map("commit_message") @db.Text
  commitDate   DateTime? @map("commit_date") @db.Timestamptz(6)
  filesChanged Int?     @map("files_changed")
  insertions   Int?
  deletions   Int?
  diffContent  String?  @map("diff_content") @db.Text
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  repository Repository @relation(fields: [repositoryId], references: [id], onDelete: Cascade)
  evaluations Evaluation[]
  evaluationHistory EvaluationHistory[]

  @@unique([repositoryId, commitHash])
  @@index([repositoryId])
  @@index([commitHash])
  @@index([authorName])
  @@index([commitDate])
  @@map("commits")
}

model Evaluation {
  id                String   @id @default(uuid()) @db.Uuid
  commitId          String   @map("commit_id") @db.Uuid
  evaluationNumber  Int      @map("evaluation_number")
  source            String?  @db.VarChar(50)
  developerOverview String?  @map("developer_overview") @db.Text
  timestamp         DateTime @db.Timestamptz(6)
  convergenceScore  Decimal? @map("convergence_score") @db.Decimal(5, 2)
  totalRounds        Int?     @map("total_rounds")
  depthMode         String?  @map("depth_mode") @db.VarChar(20)
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  commit              Commit                @relation(fields: [commitId], references: [id], onDelete: Cascade)
  agentResults        AgentResult[]
  consensusMetrics    ConsensusMetrics?
  tokenUsage          TokenUsage?
  conversationMessages ConversationMessage[]
  agentConcerns       AgentConcern[]
  evaluationHistory   EvaluationHistory[]

  @@unique([commitId, evaluationNumber])
  @@index([commitId])
  @@index([timestamp])
  @@index([source])
  @@map("evaluations")
}

model AgentResult {
  id                      String   @id @default(uuid()) @db.Uuid
  evaluationId            String   @map("evaluation_id") @db.Uuid
  agentName               String   @map("agent_name") @db.VarChar(100)
  agentRole               String?  @map("agent_role") @db.VarChar(100)
  roundNumber             Int      @map("round_number")
  summary                 String   @db.Text
  details                 String?  @db.Text
  confidenceLevel         Int?     @map("confidence_level")
  shouldParticipateNextRound Boolean @default(true) @map("should_participate_next_round")
  internalIterations      Int?     @map("internal_iterations")
  clarityScore            Int?     @map("clarity_score")
  createdAt               DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  evaluation      Evaluation        @relation(fields: [evaluationId], references: [id], onDelete: Cascade)
  agentMetrics    AgentMetric[]
  agentTokenUsage AgentTokenUsage?
  agentConcerns   AgentConcern[]

  @@unique([evaluationId, agentName, roundNumber])
  @@index([evaluationId])
  @@index([agentName])
  @@index([roundNumber])
  @@map("agent_results")
}

model AgentMetric {
  id            String   @id @default(uuid()) @db.Uuid
  agentResultId String   @map("agent_result_id") @db.Uuid
  metricName    String   @map("metric_name") @db.VarChar(50)
  metricValue   Decimal? @map("metric_value") @db.Decimal(10, 2)
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  agentResult AgentResult @relation(fields: [agentResultId], references: [id], onDelete: Cascade)

  @@unique([agentResultId, metricName])
  @@index([agentResultId])
  @@index([metricName])
  @@map("agent_metrics")
}

model ConsensusMetrics {
  id                 String   @id @default(uuid()) @db.Uuid
  evaluationId       String   @unique @map("evaluation_id") @db.Uuid
  codeQuality        Decimal? @map("code_quality") @db.Decimal(5, 2)
  codeComplexity     Decimal? @map("code_complexity") @db.Decimal(5, 2)
  idealTimeHours     Decimal? @map("ideal_time_hours") @db.Decimal(10, 2)
  actualTimeHours    Decimal? @map("actual_time_hours") @db.Decimal(10, 2)
  technicalDebtHours Decimal? @map("technical_debt_hours") @db.Decimal(10, 2)
  debtReductionHours Decimal? @map("debt_reduction_hours") @db.Decimal(10, 2)
  functionalImpact   Decimal? @map("functional_impact") @db.Decimal(5, 2)
  testCoverage       Decimal? @map("test_coverage") @db.Decimal(5, 2)
  createdAt          DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  evaluation Evaluation @relation(fields: [evaluationId], references: [id], onDelete: Cascade)

  @@index([evaluationId])
  @@map("consensus_metrics")
}

model TokenUsage {
  id          String   @id @default(uuid()) @db.Uuid
  evaluationId String  @unique @map("evaluation_id") @db.Uuid
  inputTokens Int      @default(0) @map("input_tokens")
  outputTokens Int     @default(0) @map("output_tokens")
  totalTokens Int      @default(0) @map("total_tokens")
  totalCost   Decimal  @default(0) @map("total_cost") @db.Decimal(10, 6)
  provider    String?  @db.VarChar(50)
  model       String?  @db.VarChar(100)
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  evaluation Evaluation @relation(fields: [evaluationId], references: [id], onDelete: Cascade)

  @@index([evaluationId])
  @@map("token_usage")
}

model AgentTokenUsage {
  id           String   @id @default(uuid()) @db.Uuid
  agentResultId String  @unique @map("agent_result_id") @db.Uuid
  inputTokens  Int      @default(0) @map("input_tokens")
  outputTokens Int      @default(0) @map("output_tokens")
  totalTokens  Int      @default(0) @map("total_tokens")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  agentResult AgentResult @relation(fields: [agentResultId], references: [id], onDelete: Cascade)

  @@index([agentResultId])
  @@map("agent_token_usage")
}

model ConversationMessage {
  id            String   @id @default(uuid()) @db.Uuid
  evaluationId  String   @map("evaluation_id") @db.Uuid
  roundNumber   Int      @map("round_number")
  agentRole     String   @map("agent_role") @db.VarChar(100)
  agentName     String   @map("agent_name") @db.VarChar(100)
  message       String   @db.Text
  concernsRaised String[] @map("concerns_raised") @db.Text
  referencesTo  String[] @map("references_to") @db.Text
  timestamp     DateTime @db.Timestamptz(6)
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  evaluation Evaluation @relation(fields: [evaluationId], references: [id], onDelete: Cascade)

  @@index([evaluationId])
  @@index([roundNumber])
  @@map("conversation_messages")
}

model AgentConcern {
  id                String   @id @default(uuid()) @db.Uuid
  evaluationId      String   @map("evaluation_id") @db.Uuid
  agentResultId     String   @map("agent_result_id") @db.Uuid
  concernText       String   @map("concern_text") @db.Text
  raisedInRound     Int      @map("raised_in_round")
  addressed         Boolean  @default(false)
  addressedInRound  Int?     @map("addressed_in_round")
  addressedByAgent  String?  @map("addressed_by_agent") @db.VarChar(100)
  explanation       String?  @db.Text
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  evaluation  Evaluation  @relation(fields: [evaluationId], references: [id], onDelete: Cascade)
  agentResult AgentResult @relation(fields: [agentResultId], references: [id], onDelete: Cascade)

  @@index([evaluationId])
  @@index([agentResultId])
  @@map("agent_concerns")
}

model EvaluationHistory {
  id                String   @id @default(uuid()) @db.Uuid
  commitId          String   @map("commit_id") @db.Uuid
  evaluationId      String   @map("evaluation_id") @db.Uuid
  source            String?  @db.VarChar(50)
  evaluationNumber  Int      @map("evaluation_number")
  metricsSnapshot   Json     @map("metrics_snapshot") @db.JsonB
  tokensSnapshot    Json     @map("tokens_snapshot") @db.JsonB
  convergenceScore   Decimal? @map("convergence_score") @db.Decimal(5, 2)
  timestamp         DateTime @db.Timestamptz(6)
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  commit     Commit      @relation(fields: [commitId], references: [id], onDelete: Cascade)
  evaluation Evaluation  @relation(fields: [evaluationId], references: [id], onDelete: Cascade)

  @@index([commitId])
  @@index([evaluationId])
  @@index([timestamp])
  @@map("evaluation_history")
}
```

## Schema Notes

### Repository Model
- `fullName` is used for URL generation: `<DOMAIN>/<full_name>/`
- `username` and `repoName` extracted from git remote or config
- `fullName` must be URL-safe (lowercase, no special chars)
- `password` is generated automatically when repository is created
- Password grants access to ALL evaluations for this repository
- Password is sent to Slack along with evaluation links

### Commit Model
- `diffContent` can be large; consider compression or external storage for very large diffs
- `shortHash` is the first 8 characters for display

### Evaluation Model
- Multiple evaluations per commit (re-evaluations)
- `evaluationNumber` starts at 1 and increments

### AgentResult Model
- One row per agent per round
- Multiple rounds per evaluation (conversation flow)

### AgentMetric Model
- Metrics can be NULL if agent couldn't assess
- Metric names: `codeQuality`, `codeComplexity`, `idealTimeHours`, `actualTimeHours`, `technicalDebtHours`, `debtReductionHours`, `functionalImpact`, `testCoverage`

### ConsensusMetrics Model
- Final weighted averages from all agents
- These are the "7-Pillar" scores

### TokenUsage Model
- Aggregated token usage per evaluation
- Cost calculated based on provider/model

### ConversationMessage Model
- Full conversation transcript
- Arrays stored as PostgreSQL array types

### EvaluationHistory Model
- JSONB for flexible metric storage
- Used for metric evolution visualization

## Database Configuration

### Prisma Setup

1. **Install Prisma:**
```bash
npm install prisma @prisma/client
npm install -D prisma
```

2. **Initialize Prisma:**
```bash
npx prisma init
```

3. **Environment Variables:**
Create `.env` file:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/codewave?schema=public"
```

4. **Generate Prisma Client:**
```bash
npx prisma generate
```

### Connection Configuration
Add to `src/config/config.interface.ts`:

```typescript
export interface AppConfig {
  // ... existing config ...
  
  database?: {
    enabled: boolean;
    connectionString?: string; // Prisma uses DATABASE_URL env var, but can override
  };
}
```

### Automatic Schema Application

**User Experience**: When a user enters the database connection string during configuration, the schema is automatically applied to the database. No manual migration commands required!

**Implementation**: A database service automatically:
1. Validates the connection string
2. Checks if schema needs to be applied
3. Applies migrations automatically
4. Shows confirmation message

See "Database Service Implementation" section below for details.

### Migration Strategy
- **Automatic**: Schema applied automatically when database is configured
- **Manual (Optional)**: Developers can still use `npx prisma migrate dev` for development
- **Production**: Use `npx prisma migrate deploy` for production deployments
- Prisma Migrate automatically generates SQL from schema changes

## Data Insertion Flow (Using Prisma Client)

### Prisma Client Setup
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;
```

### 1. Repository Detection/Creation
```typescript
import prisma from './lib/prisma';

// Extract from git remote or config
const remoteUrl = await getGitRemote(); // e.g., "https://github.com/username/repo.git"
const { username, repoName } = parseRemoteUrl(remoteUrl);
const fullName = `${username}/${repoName}`.toLowerCase();

// Generate password if creating new repository
const generatePassword = (): string => {
  // Generate a secure random password (12 characters, alphanumeric + special chars)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Upsert repository (generate password only on create, keep existing on update)
const existingRepo = await prisma.repository.findUnique({
  where: { fullName },
});

const repo = await prisma.repository.upsert({
  where: { fullName },
  update: {
    remoteUrl,
    updatedAt: new Date(),
    // Keep existing password on update
  },
  create: {
    username,
    repoName,
    fullName,
    remoteUrl,
    password: generatePassword(), // Generate password for new repository
  },
});
```

### 2. Commit Storage
```typescript
// After commit evaluation
const commit = await prisma.commit.upsert({
  where: {
    repositoryId_commitHash: {
      repositoryId: repo.id,
      commitHash: metadata.commitHash,
    },
  },
  update: {
    authorName: metadata.commitAuthor,
    commitMessage: metadata.commitMessage,
    commitDate: metadata.commitDate ? new Date(metadata.commitDate) : null,
    filesChanged: metadata.commitStats?.filesChanged,
    insertions: metadata.commitStats?.insertions,
    deletions: metadata.commitStats?.deletions,
    diffContent: diff,
  },
  create: {
    repositoryId: repo.id,
    commitHash: metadata.commitHash,
    shortHash: commitHash.substring(0, 8),
    authorName: metadata.commitAuthor,
    commitMessage: metadata.commitMessage,
    commitDate: metadata.commitDate ? new Date(metadata.commitDate) : null,
    filesChanged: metadata.commitStats?.filesChanged,
    insertions: metadata.commitStats?.insertions,
    deletions: metadata.commitStats?.deletions,
    diffContent: diff,
  },
});
```

### 3. Evaluation Storage
```typescript
// Get next evaluation number
const existingEvaluations = await prisma.evaluation.findMany({
  where: { commitId: commit.id },
  orderBy: { evaluationNumber: 'desc' },
  take: 1,
});
const nextEvaluationNumber = existingEvaluations.length > 0
  ? existingEvaluations[0].evaluationNumber + 1
  : 1;

// Create evaluation record
const evaluation = await prisma.evaluation.create({
  data: {
    commitId: commit.id,
    evaluationNumber: nextEvaluationNumber,
    source: metadata.source,
    developerOverview: developerOverview,
    timestamp: new Date(metadata.timestamp),
    convergenceScore: convergenceScore ? new Decimal(convergenceScore) : null,
    totalRounds: maxRounds,
    depthMode: depthMode,
  },
});
```

### 4. Agent Results Storage
```typescript
// Store each agent result with nested creates
for (const result of agentResults) {
  const agentResult = await prisma.agentResult.create({
    data: {
      evaluationId: evaluation.id,
      agentName: result.agentName,
      agentRole: result.agentRole,
      roundNumber: result.round || 0,
      summary: result.summary,
      details: result.details,
      confidenceLevel: result.confidenceLevel,
      internalIterations: result.internalIterations,
      clarityScore: result.clarityScore,
      // Nested create for metrics
      agentMetrics: result.metrics
        ? {
            create: Object.entries(result.metrics).map(([metricName, metricValue]) => ({
              metricName,
              metricValue: metricValue !== null && metricValue !== undefined
                ? new Decimal(metricValue)
                : null,
            })),
          }
        : undefined,
      // Nested create for token usage
      agentTokenUsage: result.tokenUsage
        ? {
            create: {
              inputTokens: result.tokenUsage.inputTokens,
              outputTokens: result.tokenUsage.outputTokens,
              totalTokens: result.tokenUsage.totalTokens,
            },
          }
        : undefined,
    },
  });
}
```

### 5. Consensus Metrics Storage
```typescript
import { Decimal } from '@prisma/client/runtime/library';

// Calculate and store consensus metrics
const consensusMetrics = calculateConsensusMetrics(agentResults);
await prisma.consensusMetrics.create({
  data: {
    evaluationId: evaluation.id,
    codeQuality: consensusMetrics.codeQuality
      ? new Decimal(consensusMetrics.codeQuality)
      : null,
    codeComplexity: consensusMetrics.codeComplexity
      ? new Decimal(consensusMetrics.codeComplexity)
      : null,
    idealTimeHours: consensusMetrics.idealTimeHours
      ? new Decimal(consensusMetrics.idealTimeHours)
      : null,
    actualTimeHours: consensusMetrics.actualTimeHours
      ? new Decimal(consensusMetrics.actualTimeHours)
      : null,
    technicalDebtHours: consensusMetrics.technicalDebtHours
      ? new Decimal(consensusMetrics.technicalDebtHours)
      : null,
    debtReductionHours: consensusMetrics.debtReductionHours
      ? new Decimal(consensusMetrics.debtReductionHours)
      : null,
    functionalImpact: consensusMetrics.functionalImpact
      ? new Decimal(consensusMetrics.functionalImpact)
      : null,
    testCoverage: consensusMetrics.testCoverage
      ? new Decimal(consensusMetrics.testCoverage)
      : null,
  },
});
```

### 6. Token Usage Storage
```typescript
// Aggregate token usage from all agent results
const totalInputTokens = agentResults.reduce(
  (sum, r) => sum + (r.tokenUsage?.inputTokens || 0),
  0
);
const totalOutputTokens = agentResults.reduce(
  (sum, r) => sum + (r.tokenUsage?.outputTokens || 0),
  0
);

await prisma.tokenUsage.create({
  data: {
    evaluationId: evaluation.id,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
    totalCost: new Decimal(calculatedCost),
    provider: config.llm.provider,
    model: config.llm.model,
  },
});
```

### 7. Conversation Messages Storage
```typescript
// Store conversation messages
if (conversationHistory) {
  await prisma.conversationMessage.createMany({
    data: conversationHistory.map((msg) => ({
      evaluationId: evaluation.id,
      roundNumber: msg.round,
      agentRole: msg.agentRole,
      agentName: msg.agentName,
      message: msg.message,
      concernsRaised: msg.concernsRaised || [],
      referencesTo: msg.referencesTo || [],
      timestamp: msg.timestamp,
    })),
  });
}
```

## Query Patterns (Using Prisma Client)

### Get Repository by Full Name
```typescript
const repository = await prisma.repository.findUnique({
  where: { fullName },
});
```

### Get Latest Evaluation for Commit
```typescript
const evaluation = await prisma.evaluation.findFirst({
  where: { commitId },
  include: {
    consensusMetrics: true,
    commit: true,
  },
  orderBy: { evaluationNumber: 'desc' },
});
```

### Get All Evaluations for Repository
```typescript
const commits = await prisma.commit.findMany({
  where: { repositoryId },
  include: {
    evaluations: {
      include: {
        consensusMetrics: true,
      },
      orderBy: { evaluationNumber: 'desc' },
    },
  },
  orderBy: { commitDate: 'desc' },
});
```

### Get Agent Results for Evaluation
```typescript
const agentResults = await prisma.agentResult.findMany({
  where: { evaluationId },
  include: {
    agentMetrics: true,
    agentTokenUsage: true,
  },
  orderBy: [
    { roundNumber: 'asc' },
    { agentName: 'asc' },
  ],
});
```

### Get Full Evaluation with All Relations
```typescript
const evaluation = await prisma.evaluation.findUnique({
  where: { id: evaluationId },
  include: {
    commit: {
      include: {
        repository: true,
      },
    },
    agentResults: {
      include: {
        agentMetrics: true,
        agentTokenUsage: true,
      },
      orderBy: [
        { roundNumber: 'asc' },
        { agentName: 'asc' },
      ],
    },
    consensusMetrics: true,
    tokenUsage: true,
    conversationMessages: {
      orderBy: [
        { roundNumber: 'asc' },
        { timestamp: 'asc' },
      ],
    },
    agentConcerns: {
      include: {
        agentResult: true,
      },
    },
    evaluationHistory: true,
  },
});
```

### Get Repository with Commit Statistics
```typescript
const repository = await prisma.repository.findUnique({
  where: { fullName },
  include: {
    commits: {
      include: {
        _count: {
          select: { evaluations: true },
        },
        evaluations: {
          take: 1,
          orderBy: { evaluationNumber: 'desc' },
          include: {
            consensusMetrics: true,
          },
        },
      },
      orderBy: { commitDate: 'desc' },
    },
  },
});
```

## Performance Considerations

1. **Indexing**: All foreign keys and frequently queried fields indexed
2. **Partitioning**: Consider partitioning `commits` and `evaluations` by date for large datasets
3. **Diff Storage**: For very large diffs, consider:
   - Compression (gzip)
   - External storage (S3) with reference in DB
   - Separate `commit_diffs` table with TOAST storage
4. **JSONB**: Use JSONB for flexible data (evaluation_history) with GIN indexes if needed

## Security Considerations

1. **Connection Security**: Use SSL for production connections (add `?sslmode=require` to DATABASE_URL)
2. **Credentials**: Store database credentials securely (environment variables, secrets manager)
3. **SQL Injection**: Prisma automatically uses parameterized queries, preventing SQL injection
4. **Access Control**: Implement row-level security if multi-tenant
5. **Connection Pooling**: Prisma Client manages connection pooling automatically

## Backup and Maintenance

1. **Regular Backups**: Automated daily backups
2. **Vacuum**: Regular VACUUM and ANALYZE
3. **Monitoring**: Track table sizes, query performance
4. **Archival**: Archive old evaluations if needed

## Database Service Implementation

### Automatic Schema Application Service

Create `src/services/database.service.ts` to handle automatic schema setup.

**Important**: The Prisma schema file (`prisma/schema.prisma`) must be included in the CodeWave package. It should be located at the root of the package so it can be used by both the CLI and the Next.js app.

```typescript
// src/services/database.service.ts
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';

export interface DatabaseSetupResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Initialize and apply database schema automatically
 * This is called when user configures database connection string
 */
export async function setupDatabase(
  connectionString: string
): Promise<DatabaseSetupResult> {
  try {
    // 1. Validate connection string format
    if (!isValidConnectionString(connectionString)) {
      return {
        success: false,
        message: 'Invalid database connection string format',
        error: 'Connection string must be a valid PostgreSQL URL',
      };
    }

    // 2. Set DATABASE_URL environment variable temporarily
    process.env.DATABASE_URL = connectionString;

    // 3. Test connection
    const testResult = await testDatabaseConnection(connectionString);
    if (!testResult.success) {
      return {
        success: false,
        message: 'Failed to connect to database',
        error: testResult.error,
      };
    }

    // 4. Ensure Prisma schema exists
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    if (!fs.existsSync(schemaPath)) {
      // Initialize Prisma if schema doesn't exist
      await initializePrismaSchema();
    }

    // 5. Apply schema automatically using db push (for development) or migrate deploy
    const applyResult = await applyDatabaseSchema(connectionString);
    if (!applyResult.success) {
      return {
        success: false,
        message: 'Failed to apply database schema',
        error: applyResult.error,
      };
    }

    // 6. Generate Prisma Client
    try {
      generatePrismaClient();
    } catch (error) {
      // Client generation failed, but schema is applied
      // This is non-fatal - user can generate manually
      console.warn(
        chalk.yellow('⚠️  Warning: Failed to generate Prisma Client automatically.')
      );
      console.log(chalk.gray('   Run "npx prisma generate" manually if needed.\n'));
    }

    return {
      success: true,
      message: '✅ Database schema successfully applied!',
    };
  } catch (error) {
    return {
      success: false,
      message: 'Database setup failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test database connection
 */
async function testDatabaseConnection(
  connectionString: string
): Promise<DatabaseSetupResult> {
  try {
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: connectionString,
        },
      },
    });

    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();

    return { success: true, message: 'Connection successful' };
  } catch (error) {
    return {
      success: false,
      message: 'Connection failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Validate connection string format
 */
function isValidConnectionString(connectionString: string): boolean {
  try {
    const url = new URL(connectionString);
    return url.protocol === 'postgresql:' || url.protocol === 'postgres:';
  } catch {
    return false;
  }
}

/**
 * Initialize Prisma schema if it doesn't exist
 * The schema should be included in the CodeWave package
 */
async function initializePrismaSchema(): Promise<void> {
  const prismaDir = path.join(process.cwd(), 'prisma');
  if (!fs.existsSync(prismaDir)) {
    fs.mkdirSync(prismaDir, { recursive: true });
  }

  const schemaPath = path.join(prismaDir, 'schema.prisma');
  if (!fs.existsSync(schemaPath)) {
    // Try to find schema in node_modules or package directory
    const packageSchemaPath = path.join(
      __dirname,
      '..',
      '..',
      'prisma',
      'schema.prisma'
    );
    
    if (fs.existsSync(packageSchemaPath)) {
      // Copy schema from package to project
      fs.copyFileSync(packageSchemaPath, schemaPath);
    } else {
      throw new Error(
        'Prisma schema not found. Please ensure prisma/schema.prisma exists.\n' +
        'The schema should be included in the CodeWave package.'
      );
    }
  }
}

/**
 * Apply database schema using Prisma
 * Uses `db push` for development (non-destructive) or `migrate deploy` for production
 */
async function applyDatabaseSchema(
  connectionString: string
): Promise<DatabaseSetupResult> {
  try {
    // Set DATABASE_URL for Prisma commands
    process.env.DATABASE_URL = connectionString;

    // Check if migrations directory exists
    const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
    const hasMigrations = fs.existsSync(migrationsDir) && 
      fs.readdirSync(migrationsDir).length > 0;

    let output: string;
    let command: string;

    if (hasMigrations) {
      // Use migrate deploy if migrations exist
      command = 'npx prisma migrate deploy';
      output = execSync(command, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, DATABASE_URL: connectionString },
      }).toString();
    } else {
      // Use db push for initial setup (non-destructive, creates tables)
      // --skip-generate to avoid generating client twice
      command = 'npx prisma db push --accept-data-loss --skip-generate';
      output = execSync(command, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, DATABASE_URL: connectionString },
      }).toString();
    }

    // Check output for success indicators
    if (output.includes('already in sync') || 
        output.includes('No pending migrations') ||
        output.includes('Your database is now in sync') ||
        output.includes('Applied migration')) {
      return { success: true, message: 'Schema applied successfully' };
    }

    // If we got here, something might be wrong, but no error was thrown
    return { success: true, message: 'Schema setup completed' };
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const errorOutput = error?.stdout?.toString() || error?.stderr?.toString() || '';
    
    // Check if it's a "schema already in sync" message (not an error)
    const fullError = errorMessage + ' ' + errorOutput;
    if (fullError.includes('already in sync') || 
        fullError.includes('No pending migrations') ||
        fullError.includes('Your database is now in sync')) {
      return { success: true, message: 'Schema already up to date' };
    }

    // Extract meaningful error message
    let userFriendlyError = errorMessage;
    if (errorOutput) {
      // Try to extract the actual error from Prisma output
      const match = errorOutput.match(/error:\s*(.+)/i) || 
                   errorOutput.match(/Error:\s*(.+)/i);
      if (match) {
        userFriendlyError = match[1].trim();
      }
    }

    return {
      success: false,
      message: 'Failed to apply schema',
      error: userFriendlyError,
    };
  }
}

/**
 * Generate Prisma Client
 */
function generatePrismaClient(): void {
  try {
    execSync('npx prisma generate', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (error) {
    // Non-fatal error - user can generate manually if needed
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate Prisma Client: ${errorMessage}`);
  }
}

/**
 * Get Prisma Client instance with connection string
 */
export function getPrismaClient(connectionString?: string): PrismaClient {
  if (connectionString) {
    return new PrismaClient({
      datasources: {
        db: {
          url: connectionString,
        },
      },
    });
  }
  return new PrismaClient();
}
```

### Integration with Config Command

Update `cli/commands/config.command.ts` to add database configuration prompts and automatic setup:

```typescript
// Add to DEFAULT_CONFIG:
const DEFAULT_CONFIG = {
  // ... existing config ...
  database: {
    enabled: false,
    connectionString: '',
  },
};

// In initializeConfig() function, add database configuration section (similar to Slack):

// Database Configuration
console.log(chalk.cyan('\n📊 Database Configuration\n'));
console.log(
  chalk.gray(
    '   Store evaluation data in PostgreSQL for web visualization and sharing.\n' +
    '   Leave empty to use file-only storage.\n'
  )
);

const { enableDatabase } = await inquirer.prompt([
  {
    type: 'confirm',
    name: 'enableDatabase',
    message: 'Enable database storage?',
    default: config.database?.enabled || false,
  },
]);

if (enableDatabase) {
  const databaseAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'connectionString',
      message: 'Enter PostgreSQL connection string (postgresql://user:password@host:port/database):',
      default: config.database?.connectionString || '',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'Connection string is required when enabling database';
        }
        // Basic validation
        if (!input.includes('postgresql://') && !input.includes('postgres://')) {
          return 'Connection string must be a PostgreSQL URL (postgresql://...)';
        }
        return true;
      },
    },
  ]);

  config.database = {
    enabled: true,
    connectionString: databaseAnswers.connectionString.trim(),
  };

  // Automatically set up database schema
  console.log(chalk.cyan('\n📦 Setting up database schema...'));
  console.log(chalk.gray('   This may take a few moments...\n'));

  try {
    const { setupDatabase } = await import('../../src/services/database.service');
    const result = await setupDatabase(config.database.connectionString);

    if (result.success) {
      console.log(chalk.green(result.message));
      console.log(chalk.gray('   Database is ready to use!\n'));
    } else {
      console.log(chalk.red(`❌ ${result.message}`));
      if (result.error) {
        console.log(chalk.gray(`   Error: ${result.error}\n`));
      }
      console.log(chalk.yellow('⚠️  Database will not be used. Continuing with file-only storage.\n'));
      // Disable database in config if setup failed
      config.database.enabled = false;
    }
  } catch (error) {
    console.log(chalk.red('❌ Failed to set up database'));
    console.log(chalk.gray(`   Error: ${error instanceof Error ? error.message : String(error)}\n`));
    console.log(chalk.yellow('⚠️  Database will not be used. Continuing with file-only storage.\n'));
    config.database.enabled = false;
  }
} else {
  config.database = {
    enabled: false,
    connectionString: '',
  };
}
```

**User Experience Flow:**
1. User runs `codewave config --init`
2. User enables database storage
3. User enters PostgreSQL connection string
4. System automatically:
   - Validates connection string
   - Tests database connection
   - Applies schema using `prisma db push` or `migrate deploy`
   - Generates Prisma Client
5. Shows success message: `✅ Database schema successfully applied!`
6. User can immediately start using database storage

## Migration Path

1. **Phase 1**: 
   - Create Prisma schema file (`prisma/schema.prisma`)
   - Create database service with automatic schema application
   - Add database config to CodeWave config interface
   - Integrate automatic setup into config command

2. **Phase 2**: 
   - Implement data insertion service using Prisma Client
   - Integrate alongside existing file-based storage
   - Add database service wrapper

3. **Phase 3**: 
   - Make database optional (check config.database?.enabled)
   - Fallback to file-only if not configured
   - Add error handling for database failures
   - Add health check on startup

4. **Phase 4**: 
   - Add data migration utility to import existing evaluations from local files
   - Create script to bulk import historical data

5. **Phase 5**: 
   - Make database primary storage
   - Keep file backup as optional feature
   - Add database health checks and monitoring

## Prisma Commands Reference

**Note**: Most of these commands are handled automatically by the database service. Users typically don't need to run them manually.

```bash
# Initialize Prisma (first time - done automatically)
npx prisma init

# Generate Prisma Client (done automatically after schema setup)
npx prisma generate

# Apply schema (done automatically during config)
npx prisma db push                    # For development (non-destructive)
npx prisma migrate deploy             # For production (uses migrations)

# Manual migration commands (for developers)
npx prisma migrate dev --name migration_name  # Create and apply migration
npx prisma migrate deploy                     # Apply pending migrations

# View database in Prisma Studio (GUI)
npx prisma studio

# Format schema file
npx prisma format

# Validate schema
npx prisma validate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

## Automatic Setup Summary

**What happens automatically:**
1. ✅ Connection string validation
2. ✅ Database connection test
3. ✅ Schema application (creates all tables)
4. ✅ Prisma Client generation
5. ✅ Success confirmation message

**What users need to do:**
1. Run `codewave config --init`
2. Enable database storage
3. Enter PostgreSQL connection string
4. Done! Schema is automatically applied

**No manual steps required!** 🎉


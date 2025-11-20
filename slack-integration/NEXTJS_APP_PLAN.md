# Next.js Application Plan for CodeWave Visualization

## Overview

This document outlines the plan for building a Next.js web application that fetches evaluation data from PostgreSQL and visualizes it in the same format as the current local HTML reports.

## Application Architecture

### Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Bootstrap 5 (to match existing HTML reports)
- **Database**: PostgreSQL with Prisma ORM
- **API**: Next.js API Routes or Server Actions
- **Deployment**: Vercel, Railway, or self-hosted

## URL Structure

```
<DOMAIN_NAME>/<USERNAME_REPO_NAME>/
<DOMAIN_NAME>/<USERNAME_REPO_NAME>/<COMMIT_HASH>
<DOMAIN_NAME>/<USERNAME_REPO_NAME>/<COMMIT_HASH>/<EVALUATION_NUMBER>
```

Examples:
- `https://codewave.example.com/techdebtgpt/codewave/` - Repository overview (requires password)
- `https://codewave.example.com/techdebtgpt/codewave/abc12345` - Latest evaluation for commit (requires password)
- `https://codewave.example.com/techdebtgpt/codewave/abc12345/2` - Specific evaluation number (requires password)

## Password Protection

- All evaluation pages require a password to view
- Password is per-repository (one password grants access to all evaluations for that repo)
- Password is sent to Slack along with evaluation links
- Password is stored in database and checked on each request
- Password can be passed as query parameter: `?password=xxx` or entered via form

## Project Structure

```
codewave-web/
├── app/
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Home/landing page
│   ├── [username]/
│   │   └── [repo]/
│   │       ├── page.tsx           # Repository overview
│   │       └── [commitHash]/
│   │           ├── page.tsx       # Commit evaluation (latest)
│   │           └── [evaluationNumber]/
│   │               └── page.tsx    # Specific evaluation
│   └── api/
│       ├── repositories/
│       │   └── [fullName]/
│       │       └── route.ts       # Get repository data
│       ├── commits/
│       │   └── [commitHash]/
│       │       └── route.ts       # Get commit data
│       └── evaluations/
│           └── [evaluationId]/
│               └── route.ts       # Get evaluation data
├── components/
│   ├── PasswordPrompt.tsx          # Password entry form
│   ├── RepositoryOverview.tsx
│   ├── CommitList.tsx
│   ├── EvaluationReport.tsx
│   ├── AgentTimeline.tsx
│   ├── MetricsTable.tsx
│   ├── ConversationView.tsx
│   ├── MetricEvolution.tsx
│   └── EvaluationHistory.tsx
├── lib/
│   ├── prisma.ts                  # Prisma Client instance
│   ├── queries.ts                 # Prisma query functions
│   └── types.ts                   # TypeScript types
├── prisma/
│   └── schema.prisma              # Prisma schema (shared with CLI)
├── styles/
│   └── globals.css                # Global styles + Bootstrap
└── public/
    └── ...                        # Static assets
```

## Database Integration

### Prisma Client Setup (`lib/prisma.ts`)

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### Query Functions (`lib/queries.ts`)

```typescript
import { prisma } from './prisma';

export async function getRepository(fullName: string) {
  return await prisma.repository.findUnique({
    where: { fullName },
  });
}

export async function verifyRepositoryPassword(
  fullName: string,
  password: string
): Promise<boolean> {
  const repo = await prisma.repository.findUnique({
    where: { fullName },
    select: { password: true },
  });
  
  if (!repo) {
    return false;
  }
  
  return repo.password === password;
}

export async function getCommitsForRepository(repositoryId: string) {
  return await prisma.commit.findMany({
    where: { repositoryId },
    include: {
      _count: {
        select: { evaluations: true },
      },
      evaluations: {
        take: 1,
        orderBy: { evaluationNumber: 'desc' },
      },
    },
    orderBy: { commitDate: 'desc' },
  });
}

export async function getLatestEvaluationForCommit(commitHash: string, repositoryId: string) {
  const commit = await prisma.commit.findFirst({
    where: {
      commitHash,
      repositoryId,
    },
    include: {
      evaluations: {
        include: {
          consensusMetrics: true,
        },
        orderBy: { evaluationNumber: 'desc' },
        take: 1,
      },
    },
  });

  if (!commit || commit.evaluations.length === 0) {
    return null;
  }

  return {
    ...commit.evaluations[0],
    commit: {
      commitHash: commit.commitHash,
      authorName: commit.authorName,
      commitMessage: commit.commitMessage,
      commitDate: commit.commitDate,
      filesChanged: commit.filesChanged,
      insertions: commit.insertions,
      deletions: commit.deletions,
    },
  };
}

export async function getEvaluationWithDetails(evaluationId: string) {
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
        orderBy: { raisedInRound: 'asc' },
      },
      evaluationHistory: {
        orderBy: { timestamp: 'desc' },
      },
    },
  });

  if (!evaluation) {
    return null;
  }

  return {
    evaluation,
    agentResults: evaluation.agentResults,
    conversation: evaluation.conversationMessages,
    concerns: evaluation.agentConcerns,
    history: evaluation.evaluationHistory,
  };
}
```

## Password Authentication

### Password Prompt Component (`components/PasswordPrompt.tsx`)

```typescript
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function PasswordPrompt({ repositoryFullName }: { repositoryFullName: string }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/auth/verify?fullName=${encodeURIComponent(repositoryFullName)}&password=${encodeURIComponent(password)}`);
      const data = await response.json();

      if (data.valid) {
        // Store password in sessionStorage for this repo
        sessionStorage.setItem(`repo_password_${repositoryFullName}`, password);
        // Reload page with password in URL
        const currentPath = window.location.pathname;
        router.push(`${currentPath}?password=${encodeURIComponent(password)}`);
      } else {
        setError('Invalid password. Please try again.');
      }
    } catch (err) {
      setError('Failed to verify password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="password-prompt">
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter repository password"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Verifying...' : 'Access'}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
```

### Password Verification API Route (`app/api/auth/verify/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyRepositoryPassword } from '@/lib/queries';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fullName = searchParams.get('fullName');
  const password = searchParams.get('password');

  if (!fullName || !password) {
    return NextResponse.json(
      { valid: false, error: 'Missing parameters' },
      { status: 400 }
    );
  }

  const isValid = await verifyRepositoryPassword(fullName, password);

  return NextResponse.json({ valid: isValid });
}
```

## Page Components

### 1. Repository Overview Page (`app/[username]/[repo]/page.tsx`)

**Purpose**: Display all commits for a repository with their latest evaluation metrics.

**Features**:
- Password protection (check password before showing data)
- List of all evaluated commits
- Summary statistics (total commits, average metrics, etc.)
- Filter by author, date range, metrics
- Search commits by hash or message
- Link to individual commit evaluations

**Password Flow**:
1. Check if password is in URL query params or sessionStorage
2. If no password, show password prompt
3. Verify password with API
4. If valid, show repository data
5. Store password in sessionStorage for subsequent requests

**Data Needed**:
- Repository metadata
- List of commits with latest evaluation metrics
- Aggregate statistics

**UI Components**:
- Header with repository name
- Statistics cards (total commits, average quality, etc.)
- Commit table (similar to current index.html)
- Filters and search

### 2. Commit Evaluation Page (`app/[username]/[repo]/[commitHash]/page.tsx`)

**Purpose**: Display the latest evaluation for a specific commit.

**Features**:
- Full evaluation report (same as current HTML)
- Agent timeline visualization
- Metrics table
- Conversation view
- Evaluation history (if multiple evaluations exist)
- Link to specific evaluation numbers

**Data Needed**:
- Commit metadata
- Latest evaluation with all details
- Agent results with metrics
- Conversation messages
- Concerns raised
- Token usage

**UI Components**:
- Report header (same styling as current HTML)
- Agent timeline (round-by-round visualization)
- Comprehensive metrics table
- Conversation transcript
- Evaluation history timeline

### 3. Specific Evaluation Page (`app/[username]/[repo]/[commitHash]/[evaluationNumber]/page.tsx`)

**Purpose**: Display a specific evaluation number (for re-evaluations).

**Features**:
- Same as commit evaluation page but for specific evaluation number
- Comparison with previous evaluations
- Metric evolution chart

**Data Needed**:
- Specific evaluation data
- Previous evaluation data for comparison
- Evaluation history

### 4. Home/Landing Page (`app/page.tsx`)

**Purpose**: Entry point with repository search or list.

**Features**:
- Search for repository by full name
- List of recent repositories (optional)
- Instructions/documentation

## Component Breakdown

### `EvaluationReport.tsx`
Main component that renders the full evaluation report.

**Props**:
```typescript
interface EvaluationReportProps {
  evaluation: Evaluation;
  agentResults: AgentResult[];
  conversation: ConversationMessage[];
  concerns: AgentConcern[];
  history: EvaluationHistoryEntry[];
  commit: Commit;
}
```

**Features**:
- Matches current HTML report styling
- Responsive design
- Interactive elements (modals, tabs)

### `AgentTimeline.tsx`
Visualizes agent discussions in timeline format.

**Features**:
- Round-by-round visualization
- Agent cards with icons
- Color-coded by agent type
- Expandable details

### `MetricsTable.tsx`
Displays comprehensive metrics table.

**Features**:
- 7-Pillar metrics
- Consensus values
- Per-agent contributions
- Color-coded scores

### `ConversationView.tsx`
Shows conversation transcript.

**Features**:
- Chronological message display
- Agent identification
- Concerns highlighted
- References between agents

### `MetricEvolution.tsx`
Shows how metrics changed across evaluations.

**Features**:
- Line charts for each metric
- Comparison between evaluations
- Trend indicators

### `EvaluationHistory.tsx`
Lists all evaluations for a commit.

**Features**:
- Timeline of evaluations
- Quick comparison
- Links to each evaluation

## Styling Strategy

### Match Existing HTML
- Use same Bootstrap 5 classes
- Replicate gradient backgrounds
- Match color scheme (#667eea, #764ba2)
- Same card styles and animations

### Tailwind Integration
- Use Tailwind for layout and spacing
- Bootstrap for components (buttons, badges, tables)
- Custom CSS for gradients and animations

### Responsive Design
- Mobile-first approach
- Collapsible sections on mobile
- Touch-friendly interactions

## API Routes

### `/api/repositories/[fullName]`
```typescript
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { verifyRepositoryPassword } from '@/lib/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: { fullName: string } }
) {
  try {
    // Check password from query params
    const searchParams = request.nextUrl.searchParams;
    const password = searchParams.get('password');

    if (!password) {
      return NextResponse.json(
        { error: 'Password required' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyRepositoryPassword(params.fullName, password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 403 }
      );
    }

    // Password valid, return repository data (without password field)
    const repo = await prisma.repository.findUnique({
      where: { fullName: params.fullName },
      select: {
        id: true,
        username: true,
        repoName: true,
        fullName: true,
        remoteUrl: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        commits: {
          take: 10,
          orderBy: { commitDate: 'desc' },
        },
      },
    });
    
    if (!repo) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(repo);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### `/api/commits/[commitHash]`
```typescript
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { verifyRepositoryPassword } from '@/lib/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: { commitHash: string } }
) {
  try {
    // Check password
    const searchParams = request.nextUrl.searchParams;
    const password = searchParams.get('password');
    const repositoryId = searchParams.get('repositoryId');

    if (!password || !repositoryId) {
      return NextResponse.json(
        { error: 'Password and repository ID required' },
        { status: 401 }
      );
    }

    // Get repository to verify password
    const repo = await prisma.repository.findUnique({
      where: { id: repositoryId },
      select: { fullName: true, password: true },
    });

    if (!repo || repo.password !== password) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 403 }
      );
    }

    // Password valid, return commit data
    const commit = await prisma.commit.findFirst({
      where: { commitHash: params.commitHash },
      include: {
        repository: {
          select: {
            id: true,
            username: true,
            repoName: true,
            fullName: true,
            // Don't include password
          },
        },
        evaluations: {
          include: {
            consensusMetrics: true,
          },
          orderBy: { evaluationNumber: 'desc' },
          take: 1,
        },
      },
    });
    
    if (!commit) {
      return NextResponse.json(
        { error: 'Commit not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(commit);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### `/api/evaluations/[evaluationId]`
```typescript
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { evaluationId: string } }
) {
  try {
    const evaluation = await getEvaluationWithDetails(params.evaluationId);
    
    if (!evaluation) {
      return NextResponse.json(
        { error: 'Evaluation not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(evaluation);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Data Fetching Strategy

### Server-Side Rendering (SSR)
- Use Next.js Server Components for initial load
- Fetch data in `page.tsx` or `layout.tsx`
- Pass data as props to client components

### Client-Side Fetching
- Use for interactive features (filters, search)
- React Query or SWR for caching
- Optimistic updates where appropriate

## Performance Optimizations

1. **Database Indexing**: Ensure all query fields are indexed
2. **Caching**: 
   - Next.js built-in caching
   - Redis for frequently accessed data
   - Static generation for repository pages (ISR)
3. **Pagination**: Limit commit lists to 50 per page
4. **Lazy Loading**: Load evaluation details on demand
5. **Image Optimization**: Use Next.js Image component for any images

## Security Considerations

1. **Input Validation**: Validate all URL parameters
2. **SQL Injection**: Use parameterized queries (pg library)
3. **Rate Limiting**: Implement rate limiting on API routes
4. **CORS**: Configure CORS if needed
5. **Authentication** (Future): Optional authentication for private repos

## Environment Variables

```env
# Database (Prisma uses DATABASE_URL)
DATABASE_URL="postgresql://username:password@localhost:5432/codewave?schema=public"

# Application
NEXT_PUBLIC_DOMAIN_NAME=codewave.example.com
NEXT_PUBLIC_APP_URL=https://codewave.example.com

# Optional
REDIS_URL=redis://localhost:6379
```

## Deployment Strategy

### Option 1: Vercel
- Automatic deployments from Git
- Serverless functions for API routes
- Edge functions for static pages
- Environment variables in Vercel dashboard

### Option 2: Self-Hosted
- Docker container
- Nginx reverse proxy
- PM2 for process management
- SSL via Let's Encrypt

### Option 3: Railway/Render
- One-click deployment
- Managed PostgreSQL
- Automatic SSL

## Implementation Phases

### Phase 1: Foundation
1. Set up Next.js project with TypeScript
2. Install Prisma: `npm install prisma @prisma/client`
3. Copy Prisma schema from CodeWave CLI project
4. Generate Prisma Client: `npx prisma generate`
5. Create Prisma Client instance
6. Create basic query functions
7. Set up routing structure
8. Create layout and basic styling

### Phase 2: Repository Overview
1. Implement repository page
2. Create commit list component
3. Add filtering and search
4. Style to match existing HTML

### Phase 3: Evaluation Display
1. Implement evaluation report component
2. Create agent timeline
3. Add metrics table
4. Implement conversation view

### Phase 4: Advanced Features
1. Add evaluation history
2. Implement metric evolution charts
3. Add comparison views
4. Optimize performance

### Phase 5: Polish
1. Responsive design improvements
2. Loading states and error handling
3. SEO optimization
4. Analytics integration (optional)

## Testing Strategy

1. **Unit Tests**: Test query functions and utilities (mock Prisma Client)
2. **Integration Tests**: Test API routes with test database
3. **E2E Tests**: Test full user flows (Playwright)
4. **Visual Regression**: Compare with existing HTML reports
5. **Database Tests**: Use Prisma's test utilities for database operations

## Future Enhancements

1. **Authentication**: Private repositories
2. **Webhooks**: Real-time updates
3. **Export**: PDF/CSV export
4. **Comparisons**: Compare across commits/repos
5. **Dashboards**: Custom metric dashboards
6. **Notifications**: Email/Slack notifications for new evaluations


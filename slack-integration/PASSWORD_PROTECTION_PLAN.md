# Password Protection Implementation Plan

## Overview

This document outlines the implementation of password protection for CodeWave evaluations. Each repository has a single password that grants access to ALL evaluations for that repository.

## Design Decisions

1. **One Password Per Repository**: Simpler UX - one password for all evaluations
2. **Automatic Generation**: Password generated when repository is first created
3. **Plain Text Storage**: Passwords stored in database (can be hashed in future if needed)
4. **Slack Integration**: Password sent to Slack along with evaluation links
5. **Session-Based**: Once authenticated, password stored in sessionStorage for convenience

## Database Schema Changes

### Repository Model Update

Add `password` field to Repository model:

```prisma
model Repository {
  // ... existing fields ...
  password    String   @db.VarChar(255) // Password to access all evaluations
  // ... rest of fields ...
}
```

## Password Generation

### Implementation

```typescript
// src/services/database.service.ts or src/utils/password.utils.ts

export function generateRepositoryPassword(): string {
  // Generate a secure random password (12 characters)
  // Format: Mix of uppercase, lowercase, numbers, and special characters
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill remaining 8 characters randomly
  for (let i = 4; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
```

## Database Service Updates

### Repository Creation/Update

```typescript
// In database service, when creating repository:

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
    password: generateRepositoryPassword(), // Generate on create only
  },
});

// Return password for Slack notification
return { repository: repo, password: repo.password };
```

## Slack Service Updates

### Update `src/services/slack.service.ts`

Add method to send evaluation link with password:

```typescript
/**
 * Send evaluation link and password to Slack channel
 *
 * @param channelId - Slack channel ID
 * @param evaluationLink - URL to evaluation
 * @param password - Repository password
 * @param metadata - Evaluation metadata
 * @returns true if successful, false otherwise
 */
async sendEvaluationLink(
  channelId: string,
  evaluationLink: string,
  password: string,
  metadata?: EvaluationMetadata
): Promise<boolean> {
  if (!this.client) {
    throw new Error('Slack client not initialized. Check bot token.');
  }

  try {
    const message = this.buildEvaluationMessage(evaluationLink, password, metadata);

    const result = await this.client.chat.postMessage({
      channel: channelId,
      text: message,
      blocks: this.buildEvaluationBlocks(evaluationLink, password, metadata),
    });

    return result.ok || false;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to send Slack message: ${errorMessage}`);
  }
}

/**
 * Build text message with evaluation link and password
 */
private buildEvaluationMessage(
  link: string,
  password: string,
  metadata?: EvaluationMetadata
): string {
  const lines: string[] = [];
  lines.push(`📊 *CodeWave Evaluation Results*`);
  
  if (metadata?.commitHash) {
    lines.push(`Commit: \`${metadata.commitHash.substring(0, 8)}\``);
  }

  if (metadata?.commitMessage) {
    lines.push(
      `Message: ${metadata.commitMessage.substring(0, 100)}${metadata.commitMessage.length > 100 ? '...' : ''}`
    );
  }

  if (metadata?.commitAuthor) {
    lines.push(`Author: ${metadata.commitAuthor}`);
  }

  if (metadata?.commitDate) {
    lines.push(`Date: ${metadata.commitDate}`);
  }

  lines.push('');
  lines.push(`🔗 View full report: ${link}`);
  lines.push(`🔑 Password: \`${password}\``);
  lines.push('');
  lines.push('_This password grants access to all evaluations for this repository._');

  return lines.join('\n');
}

/**
 * Build rich Slack blocks for better formatting
 */
private buildEvaluationBlocks(
  link: string,
  password: string,
  metadata?: EvaluationMetadata
): any[] {
  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '📊 CodeWave Evaluation Results',
      },
    },
    {
      type: 'section',
      fields: [
        ...(metadata?.commitHash
          ? [
              {
                type: 'mrkdwn',
                text: `*Commit:*\n\`${metadata.commitHash.substring(0, 8)}\``,
              },
            ]
          : []),
        ...(metadata?.commitAuthor
          ? [
              {
                type: 'mrkdwn',
                text: `*Author:*\n${metadata.commitAuthor}`,
              },
            ]
          : []),
      ],
    },
  ];

  if (metadata?.commitMessage) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Message:*\n${metadata.commitMessage.substring(0, 200)}${metadata.commitMessage.length > 200 ? '...' : ''}`,
      },
    });
  }

  blocks.push(
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🔗 *View Full Report:*\n<${link}|${link}>`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🔑 *Password:*\n\`\`\`${password}\`\`\``,
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: '_This password grants access to all evaluations for this repository._',
        },
      ],
    }
  );

  return blocks;
}
```

## CLI Integration

### Update Evaluation Commands

In `cli/commands/evaluate-command.ts` and `batch-evaluate-command.ts`:

```typescript
// After saving evaluation to database, get repository password
const repo = await prisma.repository.findUnique({
  where: { fullName },
  select: { password: true },
});

// Send to Slack with link and password
if (config.slack?.enabled && config.slack?.notifyOnSingle) {
  const evaluationLink = `${config.webAppUrl || 'https://codewave.example.com'}/${fullName}/${commitHash}`;
  
  await slackService.sendEvaluationLink(
    config.slack.channelId,
    evaluationLink,
    repo.password,
    metadata
  );
}
```

## Next.js App Implementation

### Password Verification Middleware

Create `middleware.ts`:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Only protect evaluation routes
  const path = request.nextUrl.pathname;
  if (!path.match(/^\/[^/]+\/[^/]+/)) {
    return NextResponse.next();
  }

  // Check if password is in query params
  const password = request.nextUrl.searchParams.get('password');
  
  // If no password, allow through (will show password prompt)
  if (!password) {
    return NextResponse.next();
  }

  // Password will be verified in API routes
  return NextResponse.next();
}

export const config = {
  matcher: ['/:username/:repo/:path*'],
};
```

### Password Prompt Component

See `NEXTJS_APP_PLAN.md` for full implementation.

### API Route Protection

All API routes that return evaluation data must:
1. Check for password in query params
2. Verify password against repository
3. Return 401/403 if invalid
4. Return data if valid

## Security Considerations

1. **Password Storage**: Currently plain text (can hash in future)
2. **Password Transmission**: Sent via Slack (secure channel)
3. **URL Parameters**: Password in URL query params (visible in browser history)
   - Consider using sessionStorage after initial authentication
4. **HTTPS**: Must use HTTPS in production
5. **Rate Limiting**: Add rate limiting to password verification endpoint

## Future Enhancements

1. **Password Hashing**: Hash passwords in database (bcrypt)
2. **Password Reset**: Allow repository owners to reset password
3. **Multiple Passwords**: Support multiple passwords per repository
4. **Password Expiration**: Optional password expiration
5. **Access Logs**: Log password access attempts
6. **Session Management**: Better session handling (cookies instead of query params)

## Testing

1. **Password Generation**: Test password format and uniqueness
2. **Password Verification**: Test correct/incorrect passwords
3. **Slack Integration**: Test message formatting
4. **Next.js App**: Test password prompt and authentication flow
5. **API Routes**: Test password verification in all routes


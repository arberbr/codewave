# Slack Integration Plan for CodeWave

## Executive Summary

This document outlines a comprehensive plan to integrate Slack notifications into CodeWave, enabling automatic delivery of evaluation results as ZIP files to specified Slack channels upon completion.

## Current State Analysis

### Project Structure

- **Language**: TypeScript
- **Framework**: Node.js CLI tool using Commander.js
- **Commands**:
  - `evaluate` - Single commit evaluation
  - `batch` - Multiple commits evaluation
  - `config` - Configuration management
- **Output Structure**: `.evaluated-commits/{commitHash}/` containing:
  - `report-enhanced.html` - Interactive HTML report
  - `conversation.md` - Markdown transcript
  - `results.json` - Full JSON results
  - `summary.txt` - Quick text summary
  - `commit.diff` - Original diff file
  - `history.json` - Evaluation history

### Configuration System

- Configuration stored in `.codewave.config.json`
- Interactive setup via `codewave config --init`
- Configuration interface: `src/config/config.interface.ts`
- Config loader: `src/config/config-loader.ts`

## Requirements

### Functional Requirements

1. **Enable/Disable Slack Integration**: Users can enable/disable Slack notifications during configuration
2. **Slack Channel Configuration**: Users can specify the Slack channel ID where files should be sent
3. **Bot Token Management**: Secure storage of Slack Bot User OAuth Token
4. **Automatic ZIP Creation**: Package all generated files into a ZIP archive
5. **Post-Evaluation Notification**: Send ZIP file to Slack after evaluation completes
6. **Batch Mode Support**: Handle Slack notifications for batch evaluations
7. **Error Handling**: Graceful error handling if Slack API fails (should not break main workflow)

### Non-Functional Requirements

1. **Security**: Bot tokens stored securely (not hardcoded)
2. **Resilience**: Slack failures should not prevent evaluation from completing
3. **User Feedback**: Clear feedback when Slack notification succeeds/fails
4. **Opt-in**: Slack integration is optional and disabled by default

## Technical Design

### 1. Dependencies

#### Required npm packages:

```json
{
  "@slack/web-api": "^7.0.0",
  "archiver": "^7.0.0"
}
```

**Package Research:**

1. **@slack/web-api** (v7.0.0+)
   - Official Slack Web API client for Node.js
   - Supports `files.uploadV2` method for file uploads
   - Handles OAuth token authentication
   - TypeScript support included
   - Documentation: https://slack.dev/node-slack-sdk/

2. **archiver** (v7.0.0+)
   - Fast, streaming ZIP creation library
   - Supports file streams and buffers
   - Works well with async/await
   - No external dependencies
   - Documentation: https://www.archiverjs.com/

### 2. Configuration Schema

**Add to `src/config/config.interface.ts`:**

```typescript
export interface AppConfig {
  // ... existing config ...

  slack?: {
    enabled: boolean;
    botToken: string;
    channelId: string;
    notifyOnSingle: boolean; // Notify for single evaluations
    notifyOnBatch: boolean; // Notify for batch evaluations
  };
}
```

**Default values in `src/config/default-config.ts`:**

```typescript
slack: {
  enabled: false,
  botToken: '',
  channelId: '',
  notifyOnSingle: true,
  notifyOnBatch: true,
}
```

### 3. File Structure

```
src/
├── services/
│   └── slack.service.ts          # NEW: Slack integration service
├── utils/
│   └── zip-utils.ts              # NEW: ZIP file creation utilities
└── config/
    ├── config.interface.ts       # MODIFY: Add slack config
    └── default-config.ts         # MODIFY: Add slack defaults

cli/
├── commands/
│   ├── config.command.ts         # MODIFY: Add Slack config prompts
│   ├── evaluate-command.ts       # MODIFY: Add Slack notification
│   └── batch-evaluate-command.ts # MODIFY: Add Slack notification
```

### 4. Implementation Components

#### A. Slack Service (`src/services/slack.service.ts`)

**Responsibilities:**

- Initialize Slack WebClient with bot token
- Upload ZIP files to Slack using `files.uploadV2`
- Send notification messages
- Handle errors gracefully

**Key Methods:**

```typescript
class SlackService {
  constructor(token: string);
  async uploadZipFile(
    channelId: string,
    zipPath: string,
    commitHash: string,
    metadata: EvaluationMetadata
  ): Promise<boolean>;
  async sendMessage(channelId: string, text: string): Promise<boolean>;
  isConfigured(): boolean;
}
```

**Implementation Notes:**

- Use `files.uploadV2` method (not deprecated `files.upload`)
- Include initial comment with commit metadata
- Set appropriate filename: `codewave-{commitHash}-{timestamp}.zip`
- Return boolean for success/failure

#### B. ZIP Utility (`src/utils/zip-utils.ts`)

**Responsibilities:**

- Create ZIP archive from evaluation directory
- Include all generated files
- Handle file system errors
- Clean up temporary files (optional)

**Key Methods:**

```typescript
async function createEvaluationZip(outputDir: string, commitHash: string): Promise<string>;
```

**ZIP Contents:**

- report-enhanced.html
- conversation.md
- results.json
- summary.txt
- commit.diff
- history.json (if exists)

**Implementation Notes:**

- Use `archiver` with zip format
- Save to temp directory: `{outputDir}/evaluation-{commitHash}-{timestamp}.zip`
- Return path to created ZIP file

#### C. Configuration Updates

**Modify `cli/commands/config.command.ts`:**

- Add Slack configuration section in `initializeConfig()`
- Prompt for:
  - Enable Slack integration? (yes/no)
  - Slack Bot Token (password input)
  - Slack Channel ID (text input)
  - Notify on single evaluations? (yes/no, default: yes)
  - Notify on batch evaluations? (yes/no, default: yes)
- Validate channel ID format (starts with 'C' for public, 'D' for DM)
- Test connection (optional but recommended)

#### D. Integration Points

**Modify `cli/commands/evaluate-command.ts`:**

- After `saveEvaluationReports()` completes successfully
- Check if Slack is enabled and `notifyOnSingle` is true
- Create ZIP file
- Upload to Slack
- Log success/failure
- Continue even if Slack fails

**Modify `cli/commands/batch-evaluate-command.ts`:**

- After all evaluations complete in `runBatchEvaluateCommand()`
- Check if Slack is enabled and `notifyOnBatch` is true
- Create ZIP for each successful evaluation OR one combined ZIP
- Upload to Slack
- Log success/failure

## Implementation Steps

### Phase 1: Core Infrastructure (Foundation)

1. ✅ Install dependencies: `npm install @slack/web-api archiver`
2. ✅ Update TypeScript types (`@types/archiver` may be needed)
3. ✅ Create `src/utils/zip-utils.ts` with ZIP creation functionality
4. ✅ Create `src/services/slack.service.ts` with Slack API integration
5. ✅ Update `src/config/config.interface.ts` with Slack config
6. ✅ Update `src/config/default-config.ts` with Slack defaults

### Phase 2: Configuration (User Setup)

7. ✅ Modify `cli/commands/config.command.ts`:
   - Add Slack configuration prompts
   - Add validation for channel ID
   - Store bot token securely
   - Test connection (optional)

### Phase 3: Single Evaluation Integration

8. ✅ Modify `cli/commands/evaluate-command.ts`:
   - Import Slack service and ZIP utility
   - Add Slack notification after report save
   - Handle errors gracefully
   - Add user feedback messages

### Phase 4: Batch Evaluation Integration

9. ✅ Modify `cli/commands/batch-evaluate-command.ts`:
   - Add Slack notification after batch completion
   - Decide on notification strategy (per-commit vs. batch summary)
   - Handle multiple ZIP files or combine into one

### Phase 5: Testing & Documentation

10. ✅ Test Slack integration with real Slack workspace
11. ✅ Test error scenarios (invalid token, wrong channel, API down)
12. ✅ Update README.md with Slack setup instructions
13. ✅ Add troubleshooting section for common Slack issues

## Detailed Implementation Guide

### Step 1: Install Dependencies

```bash
npm install @slack/web-api archiver
npm install --save-dev @types/archiver  # If types not included
```

### Step 2: Create ZIP Utility

**File: `src/utils/zip-utils.ts`**

- Create ZIP from directory
- Stream files into archive
- Handle errors
- Return ZIP file path

### Step 3: Create Slack Service

**File: `src/services/slack.service.ts`**

- Initialize WebClient
- Implement `uploadZipFile()` using `files.uploadV2`
- Implement error handling
- Validate configuration

### Step 4: Update Configuration Interface

**File: `src/config/config.interface.ts`**

- Add `slack?: { ... }` to `AppConfig`

### Step 5: Update Config Command

**File: `cli/commands/config.command.ts`**

- Add Slack section after LangSmith tracing
- Prompt for Slack settings
- Validate inputs

### Step 6: Integrate into Evaluate Command

**File: `cli/commands/evaluate-command.ts`**

- After line 503 (`await saveEvaluationReports(...)`)
- Add Slack notification logic
- Wrap in try-catch to prevent errors

### Step 7: Integrate into Batch Command

**File: `cli/commands/batch-evaluate-command.ts`**

- After all evaluations complete
- Add Slack notification logic
- Consider notification strategy

## Slack Setup Instructions (For Users)

### Prerequisites

1. Slack workspace with admin access
2. Ability to create Slack apps

### Steps

1. **Create Slack App:**
   - Go to https://api.slack.com/apps
   - Click "Create New App" → "From scratch"
   - Name: "CodeWave Bot"
   - Select workspace

2. **Configure Bot User:**
   - Navigate to "OAuth & Permissions"
   - Scroll to "Scopes" → "Bot Token Scopes"
   - Add scopes:
     - `chat:write` - Send messages
     - `files:write` - Upload files
     - `channels:read` - Read channel info (optional)

3. **Install App to Workspace:**
   - Click "Install to Workspace"
   - Authorize permissions
   - Copy "Bot User OAuth Token" (starts with `xoxb-`)

4. **Get Channel ID:**
   - Open Slack in browser
   - Navigate to desired channel
   - Channel ID is in URL: `https://yourworkspace.slack.com/archives/C1234567890`
   - Channel ID is `C1234567890`
   - For DMs, use your user ID (starts with `U`)

5. **Configure CodeWave:**
   - Run `codewave config --init`
   - Enable Slack integration
   - Enter bot token and channel ID

## Error Handling Strategy

### Slack API Errors

- Invalid token → Log warning, continue evaluation
- Channel not found → Log error, continue evaluation
- File too large (Slack limit: 1GB) → Log warning, continue
- Network errors → Retry once, then log and continue
- Rate limiting → Implement exponential backoff (future enhancement)

### ZIP Creation Errors

- File not found → Log error, skip Slack notification
- Permission errors → Log error, skip Slack notification
- Disk full → Log error, skip Slack notification

### User Feedback

- Success: `✅ Evaluation results sent to Slack: #channel-name`
- Failure: `⚠️  Failed to send to Slack (evaluation completed successfully)`
- Disabled: No message (silent)

## Security Considerations

1. **Token Storage:**
   - Store bot token in `.codewave.config.json`
   - Add `.codewave.config.json` to `.gitignore` (already done)
   - Never log full token (mask in logs)

2. **Token Validation:**
   - Validate token format (starts with `xoxb-`)
   - Test token on configuration

3. **Channel ID Validation:**
   - Validate format (public channels start with `C`, private with `G`, DMs with `D`)

## Testing Plan

### Unit Tests

- ZIP utility: Test file creation, error handling
- Slack service: Mock Slack API, test upload, test errors

### Integration Tests

- End-to-end: Run evaluation, verify ZIP created, verify Slack upload
- Error scenarios: Invalid token, wrong channel, network failure

### Manual Testing

1. Configure Slack with valid credentials
2. Run single evaluation
3. Verify ZIP uploaded to Slack channel
4. Test with disabled Slack integration
5. Test with invalid token
6. Test batch evaluation with Slack enabled

## Future Enhancements

1. **Rich Notifications:**
   - Include summary metrics in Slack message
   - Add buttons/links to view reports
   - Use Slack blocks for formatted messages

2. **Multiple Channels:**
   - Support multiple Slack channels
   - Different channels for different commit types

3. **Notification Templates:**
   - Customizable message templates
   - Include commit details in message

4. **Retry Logic:**
   - Exponential backoff for rate limits
   - Queue failed uploads for retry

5. **Slack Workflows:**
   - Trigger Slack workflows
   - Integrate with Slack apps/workflows

## Estimated Implementation Time

- **Phase 1 (Infrastructure)**: 2-3 hours
- **Phase 2 (Configuration)**: 1-2 hours
- **Phase 3 (Single Evaluation)**: 1-2 hours
- **Phase 4 (Batch Evaluation)**: 2-3 hours
- **Phase 5 (Testing & Docs)**: 2-3 hours

**Total**: 8-13 hours

## Dependencies Impact

- **New runtime dependencies**: 2 packages (`@slack/web-api`, `archiver`)
- **Bundle size increase**: ~500KB (estimated)
- **No breaking changes**: All changes are additive

## Rollback Plan

If issues arise:

1. Slack integration is opt-in (disabled by default)
2. Errors don't break main workflow
3. Can be disabled via configuration
4. No changes to existing evaluation logic

---

## Summary

This plan provides a comprehensive roadmap for integrating Slack notifications into CodeWave. The implementation is:

- **Non-intrusive**: Opt-in, doesn't break existing functionality
- **Secure**: Proper token management
- **Resilient**: Errors don't stop evaluations
- **User-friendly**: Clear configuration and feedback
- **Extensible**: Foundation for future enhancements

The plan follows the existing codebase patterns and architecture, ensuring consistency and maintainability.

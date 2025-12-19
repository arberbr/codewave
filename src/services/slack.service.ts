// src/services/slack.service.ts
// Slack integration service for sending evaluation results

import { WebClient } from '@slack/web-api';
import * as fs from 'fs';
import * as path from 'path';

import { MetricScores } from '../types/output.types';

export interface EvaluationMetadata {
  commitHash: string;
  commitAuthor?: string;
  commitMessage?: string;
  commitDate?: string;
  timestamp?: string;
  source?: string;
  metrics?: Partial<MetricScores>;
}

/**
 * Slack service for uploading evaluation results
 */
export class SlackService {
  private client: WebClient | null = null;
  private botToken: string;

  constructor(botToken: string) {
    this.botToken = botToken;
    if (botToken) {
      this.client = new WebClient(botToken);
    }
  }

  /**
   * Check if Slack is properly configured
   */
  isConfigured(): boolean {
    return !!this.botToken && !!this.client;
  }

  /**
   * Upload the PDF file to Slack channel
   *
   * @param channelId - Slack channel ID (e.g., C1234567890)
   * @param filePath - Path to PDF File
   * @param commitHash - Commit hash for message context
   * @param metadata - Additional evaluation metadata including metrics
   * @returns true if successful, false otherwise
   */
  async uploadFile(
    channelId: string,
    filePath: string,
    commitHash: string,
    metadata?: EvaluationMetadata
  ): Promise<boolean> {
    if (!this.client) {
      throw new Error('Slack client not initialized. Check bot token.');
    }

    // Validate file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    try {
      // Read file
      const fileBuffer = fs.readFileSync(filePath);
      const filename = path.basename(filePath);

      // Create initial comment with metadata and metrics
      const comment = this.buildComment(commitHash, metadata);

      // Upload file using files.uploadV2 (not deprecated files.upload)
      const result = await this.client.files.uploadV2({
        channel_id: channelId,
        file: fileBuffer,
        filename: filename,
        title: `CodeWave Evaluation: ${commitHash.substring(0, 8)}`,
        initial_comment: comment,
      });

      if (result.ok) {
        return true;
      } else {
        throw new Error(result.error || 'Unknown Slack API error');
      }
    } catch (error) {
      // Re-throw with more context
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upload to Slack: ${errorMessage}`);
    }
  }

  /**
   * Send a text message to Slack channel
   *
   * @param channelId - Slack channel ID
   * @param text - Message text
   * @returns true if successful, false otherwise
   */
  async sendMessage(channelId: string, text: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Slack client not initialized. Check bot token.');
    }

    try {
      const result = await this.client.chat.postMessage({
        channel: channelId,
        text,
      });

      return result.ok || false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to send Slack message: ${errorMessage}`);
    }
  }

  /**
   * Build comment text with evaluation metadata and metrics
   */
  private buildComment(commitHash: string, metadata?: EvaluationMetadata): string {
    const lines: string[] = [];
    lines.push(`📊 *CodeWave Evaluation Results*\n`);

    // Commit basic info - first line
    const commitInfo: string[] = [];
    commitInfo.push(`*Hash:* \`${commitHash.substring(0, 8)}\``);
    
    if (metadata?.commitAuthor) {
      commitInfo.push(`*Author:* ${metadata.commitAuthor}`);
    }

    if (metadata?.commitDate) {
      // Format date from ISO string to MM/DD/YYYY
      const commitDate = new Date(metadata.commitDate);
      const formattedCommitDate = commitDate.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
      commitInfo.push(`*Date:* ${formattedCommitDate}`);
    }

    if (metadata?.timestamp) {
      const evalDate = new Date(metadata.timestamp);
      const formattedEvalDate = evalDate.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
      commitInfo.push(`*Last Evaluated:* ${formattedEvalDate}`);
    }

    if (metadata?.source) {
      commitInfo.push(`*Source:* ${metadata.source}`);
    }

    // Add each commit info field on its own line
    commitInfo.forEach(info => lines.push(info));
    
    // Message on its own line if available
    if (metadata?.commitMessage) {
      lines.push(`*Message:* ${metadata.commitMessage}`);
    }
    
    lines.push('');

    // Metrics section
    if (metadata?.metrics) {
      const metrics = metadata.metrics;
      const metricsLines: string[] = [];
      
      // Quality (Code Quality)
      if (metrics.codeQuality !== undefined) {
        const quality = metrics.codeQuality.toFixed(1);
        metricsLines.push(`*Quality:* ${quality}/10`);
      }

      // Complexity (Code Complexity)
      if (metrics.codeComplexity !== undefined) {
        const complexity = metrics.codeComplexity.toFixed(1);
        metricsLines.push(`*Complexity:* ${complexity}/10`);
      }

      // Tests (Test Coverage)
      if (metrics.testCoverage !== undefined) {
        const tests = metrics.testCoverage.toFixed(1);
        metricsLines.push(`*Tests:* ${tests}/10`);
      }

      // Impact (Functional Impact)
      if (metrics.functionalImpact !== undefined) {
        const impact = metrics.functionalImpact.toFixed(1);
        metricsLines.push(`*Impact:* ${impact}/10`);
      }

      // Commit Score
      if (metrics.commitScore !== undefined) {
        const score = metrics.commitScore.toFixed(1);
        metricsLines.push(`*Commit Score:* ${score}/10`);
      }

      // Time (Actual Time Hours)
      if (metrics.actualTimeHours !== undefined) {
        const time = metrics.actualTimeHours.toFixed(1);
        metricsLines.push(`*Time:* ${time}h`);
      }

      // Tech Debt (Technical Debt Hours - can be negative)
      if (metrics.technicalDebtHours !== undefined) {
        const techDebt = metrics.technicalDebtHours.toFixed(1);
        metricsLines.push(`*Tech Debt:* ${techDebt}h`);
      }

      // Add each metric on its own line
      if (metricsLines.length > 0) {
        metricsLines.forEach(metric => lines.push(metric));
      }
    }

    return lines.join('\n');
  }

  /**
   * Test Slack connection by validating token and sending a test message
   *
   * @param channelId - Slack channel ID to test
   * @returns Object with success status and error message if failed
   */
  async testConnection(channelId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Slack client not initialized. Check bot token.' };
    }

    try {
      // First, test the token by calling auth.test
      const authResult = await this.client.auth.test();
      if (!authResult.ok) {
        return {
          success: false,
          error: `Token validation failed: ${authResult.error || 'Unknown error'}`,
        };
      }

      // Then try to send a test message
      const result = await this.client.chat.postMessage({
        channel: channelId,
        text: '✅ CodeWave Slack integration test successful!',
      });

      if (result.ok) {
        return { success: true };
      } else {
        // Extract detailed error information
        const errorCode = (result as any).error;
        let errorMessage = `Failed to send message: ${errorCode || 'Unknown error'}`;

        // Provide helpful error messages for common issues
        if (errorCode === 'channel_not_found') {
          errorMessage =
            'Channel not found. Make sure the bot is added to the channel and the channel ID is correct.';
        } else if (errorCode === 'not_in_channel') {
          errorMessage =
            'Bot is not in the channel. The bot must be added to the channel before it can post messages.\n' +
            '   To fix: Go to the Slack channel, type "/invite @YourBotName" or add the bot via channel settings.';
        } else if (errorCode === 'invalid_auth') {
          errorMessage = 'Invalid authentication. Please check your bot token.';
        } else if (errorCode === 'missing_scope') {
          errorMessage =
            'Missing required scope. The bot needs "chat:write" permission. Please check your Slack app permissions.';
        }

        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Connection test failed: ${errorMessage}`,
      };
    }
  }
}

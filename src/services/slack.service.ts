// src/services/slack.service.ts
// Slack integration service for sending evaluation results

import { WebClient } from '@slack/web-api';
import * as fs from 'fs';
import * as path from 'path';

export interface EvaluationMetadata {
  commitHash: string;
  commitAuthor?: string;
  commitMessage?: string;
  commitDate?: string;
  timestamp?: string;
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
   * Upload ZIP file to Slack channel
   *
   * @param channelId - Slack channel ID (e.g., C1234567890)
   * @param zipPath - Path to ZIP file
   * @param commitHash - Commit hash for message context
   * @param metadata - Additional evaluation metadata
   * @returns true if successful, false otherwise
   */
  async uploadZipFile(
    channelId: string,
    zipPath: string,
    commitHash: string,
    metadata?: EvaluationMetadata
  ): Promise<boolean> {
    if (!this.client) {
      throw new Error('Slack client not initialized. Check bot token.');
    }

    // Validate ZIP file exists
    if (!fs.existsSync(zipPath)) {
      throw new Error(`ZIP file not found: ${zipPath}`);
    }

    try {
      // Read ZIP file
      const zipBuffer = fs.readFileSync(zipPath);
      const zipFilename = path.basename(zipPath);

      // Create initial comment with metadata
      const comment = this.buildComment(commitHash, metadata);

      // Upload file using files.uploadV2 (not deprecated files.upload)
      const result = await this.client.files.uploadV2({
        channel_id: channelId,
        file: zipBuffer,
        filename: zipFilename,
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
   * Build comment text with evaluation metadata
   */
  private buildComment(commitHash: string, metadata?: EvaluationMetadata): string {
    const lines: string[] = [];
    lines.push(`📊 *CodeWave Evaluation Results*`);
    lines.push(`Commit: \`${commitHash.substring(0, 8)}\``);

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

    lines.push(
      `\nThis ZIP contains the complete evaluation report, conversation transcript, and analysis results.`
    );

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

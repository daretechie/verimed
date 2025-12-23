import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

/**
 * Webhook Event Types
 */
export enum WebhookEventType {
  VERIFICATION_COMPLETED = 'verification.completed',
  VERIFICATION_EXPIRED = 'verification.expired',
  VERIFICATION_EXPIRING_SOON = 'verification.expiring_soon',
  BATCH_COMPLETED = 'batch.completed',
  SANCTIONS_MATCH = 'sanctions.match',
}

/**
 * Webhook Payload
 */
export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Webhook Configuration
 */
export interface WebhookConfig {
  url: string;
  secret?: string;
  events: WebhookEventType[];
}

/**
 * Webhook Service
 *
 * Sends notifications to configured webhook endpoints when:
 * - Verification completes
 * - Verification expires or is expiring soon
 * - Batch verification completes
 * - Sanctions match found
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly webhookUrl: string | undefined;
  private readonly webhookSecret: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.webhookUrl = this.configService.get<string>('WEBHOOK_URL');
    this.webhookSecret = this.configService.get<string>('WEBHOOK_SECRET');
  }

  /**
   * Send a webhook notification
   */
  async send(
    event: WebhookEventType,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    if (!this.webhookUrl) {
      this.logger.debug(
        `[Webhook] No WEBHOOK_URL configured, skipping: ${event}`,
      );
      return false;
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add signature if secret is configured
      if (this.webhookSecret) {
        const signature = this.generateSignature(JSON.stringify(payload));
        headers['X-Webhook-Signature'] = signature;
      }

      this.logger.log(`[Webhook] Sending ${event} to ${this.webhookUrl}`);

      await axios.post(this.webhookUrl, payload, {
        headers,
        timeout: 10000,
      });

      this.logger.log(`[Webhook] Successfully sent: ${event}`);
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`[Webhook] Failed to send ${event}: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Notify when verification completes
   */
  async notifyVerificationCompleted(
    transactionId: string,
    providerId: string,
    status: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.send(WebhookEventType.VERIFICATION_COMPLETED, {
      transactionId,
      providerId,
      status,
      ...metadata,
    });
  }

  /**
   * Notify when verification is expiring soon
   */
  async notifyExpiringVerification(
    transactionId: string,
    providerId: string,
    daysRemaining: number,
    expiresAt: string,
  ): Promise<void> {
    await this.send(WebhookEventType.VERIFICATION_EXPIRING_SOON, {
      transactionId,
      providerId,
      daysRemaining,
      expiresAt,
    });
  }

  /**
   * Notify when verification has expired
   */
  async notifyExpiredVerification(
    transactionId: string,
    providerId: string,
    expiredAt: string,
  ): Promise<void> {
    await this.send(WebhookEventType.VERIFICATION_EXPIRED, {
      transactionId,
      providerId,
      expiredAt,
    });
  }

  /**
   * Notify when batch verification completes
   */
  async notifyBatchCompleted(
    batchId: string,
    total: number,
    successful: number,
    failed: number,
  ): Promise<void> {
    await this.send(WebhookEventType.BATCH_COMPLETED, {
      batchId,
      total,
      successful,
      failed,
    });
  }

  /**
   * Notify when sanctions match is found
   */
  async notifySanctionsMatch(
    transactionId: string,
    providerId: string,
    source: string,
    matchDetails: Record<string, unknown>,
  ): Promise<void> {
    await this.send(WebhookEventType.SANCTIONS_MATCH, {
      transactionId,
      providerId,
      source,
      matchDetails,
    });
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: string): string {
    return crypto
      .createHmac('sha256', this.webhookSecret || 'secret')
      .update(payload)
      .digest('hex');
  }

  /**
   * Check if webhooks are configured
   */
  isConfigured(): boolean {
    return !!this.webhookUrl;
  }
}

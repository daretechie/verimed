import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { VerificationLogEntity } from '../persistence/entities/verification-log.entity';

@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);
  private readonly RETENTION_DAYS = 90;

  constructor(
    @InjectRepository(VerificationLogEntity)
    private readonly auditRepo: Repository<VerificationLogEntity>,
  ) {}

  /**
   * Nightly job to redact PII from logs older than 90 days.
   * Runs at midnight every day.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyCleanup() {
    this.logger.log('Starting daily data retention cleanup...');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

    try {
      // Find IDs of records to update first (safest for audit)
      // In a very large DB, we might batch this. For now, we do a direct update.

      const result = await this.auditRepo
        .createQueryBuilder()
        .update(VerificationLogEntity)
        .set({
          attributes: {
            firstName: '[REDACTED]',
            lastName: '[REDACTED]',
            licenseNumber: '[REDACTED]',
            redactedAt: new Date().toISOString(),
          },
          // We can mark status to indicate anonymization if needed,
          // but keeping original status is often useful for metrics.
        })
        .where('timestamp < :cutoff', { cutoff: cutoffDate })
        // Avoid re-redacting already redacted records to save DB cycles
        .andWhere(`attributes ->> 'firstName' != '[REDACTED]'`)
        .execute();

      if (result.affected && result.affected > 0) {
        this.logger.log(
          `[GDPR] Successfully redacted ${result.affected} verification records older than ${this.RETENTION_DAYS} days.`,
        );
      } else {
        this.logger.log('[GDPR] No records found requiring redaction today.');
      }
    } catch (error) {
      this.logger.error('Failed to execute data retention cleanup', error);
    }
  }
}

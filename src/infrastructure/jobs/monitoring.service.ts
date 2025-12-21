import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VerifyProviderUseCase } from '../../application/use-cases/verify-provider.use-case';
import type { IVerificationRepository } from '../../domain/ports/verification-repository.port';
import { TypeOrmVerificationRepository } from '../persistence/repositories/typeorm-verification.repository';
import { VERIFICATION_WINDOW } from '../persistence/entities/verification-log.entity';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  // Warning threshold: alert when verification expires within this many days
  private readonly EXPIRATION_WARNING_DAYS = 14;

  constructor(
    private readonly verifyUseCase: VerifyProviderUseCase,
    @Inject('VerificationRepository')
    private readonly repository: IVerificationRepository,
  ) {}

  /**
   * Daily check for expiring verifications
   * Logs warnings for verifications expiring within 14 days
   * NCQA 2025 requires PSV within 120 days for accreditation
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async checkExpiringVerifications(): Promise<void> {
    this.logger.log(
      `[NCQA Compliance] Checking for verifications expiring within ${this.EXPIRATION_WARNING_DAYS} days...`,
    );

    try {
      // Cast to access extended repository methods
      const extendedRepo = this.repository as TypeOrmVerificationRepository;

      // Find verifications expiring within warning threshold
      const expiring = await extendedRepo.findExpiringVerifications(
        this.EXPIRATION_WARNING_DAYS,
      );

      if (expiring.length > 0) {
        this.logger.warn(
          `[NCQA Alert] ${expiring.length} verifications expiring soon:`,
        );

        for (const log of expiring) {
          const daysRemaining = log.getDaysUntilExpiration();
          this.logger.warn(
            `  - Provider ${log.providerId} (${log.countryCode}): ${daysRemaining} days remaining`,
          );

          // In production, trigger webhook/email notification here
          // await this.notificationService.sendExpirationAlert(log);
        }
      } else {
        this.logger.log('[NCQA Compliance] No verifications expiring soon.');
      }

      // Also check for already expired verifications
      const expired = await extendedRepo.findExpiredVerifications();

      if (expired.length > 0) {
        this.logger.error(
          `[NCQA Alert] ${expired.length} verifications have EXPIRED and need immediate re-verification:`,
        );

        for (const log of expired) {
          this.logger.error(
            `  - Provider ${log.providerId} (${log.countryCode}): Expired ${Math.abs(log.getDaysUntilExpiration())} days ago`,
          );
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[NCQA Compliance] Error checking expiring verifications: ${errorMessage}`,
      );
    }
  }

  /**
   * Weekly automatic re-verification for expired providers
   * Only runs for providers with expired verifications
   */
  @Cron(CronExpression.EVERY_WEEK)
  async autoReverifyExpired(): Promise<void> {
    this.logger.log(
      '[NCQA Compliance] Starting automatic re-verification of expired providers...',
    );

    try {
      const extendedRepo = this.repository as TypeOrmVerificationRepository;
      const expired = await extendedRepo.findExpiredVerifications();

      this.logger.log(
        `Found ${expired.length} expired verifications to re-verify.`,
      );

      // Limit batch size to avoid overwhelming APIs
      const batchSize = 10;
      const batch = expired.slice(0, batchSize);

      for (const log of batch) {
        try {
          this.logger.log(
            `Re-verifying expired provider: ${log.providerId}...`,
          );

          // Find verified providers and re-run verification
          const providers = await this.repository.findVerifiedProviders();
          const provider = providers.find(
            (p) => p.providerId === log.providerId,
          );

          if (provider) {
            await this.verifyUseCase.execute(provider);
            this.logger.log(
              `✅ Re-verified provider ${log.providerId} successfully`,
            );
          }
        } catch (providerError) {
          const errorMsg =
            providerError instanceof Error
              ? providerError.message
              : String(providerError);
          this.logger.error(
            `Failed to re-verify provider ${log.providerId}: ${errorMsg}`,
          );
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[NCQA Compliance] Error in auto re-verification: ${errorMessage}`,
      );
    }
  }

  /**
   * Health stats endpoint for monitoring dashboard
   */
  async getVerificationStats(): Promise<{
    total: number;
    expiringSoon: number;
    expired: number;
    verificationWindowDays: number;
  }> {
    const extendedRepo = this.repository as TypeOrmVerificationRepository;

    const [expiringSoon, expired] = await Promise.all([
      extendedRepo.findExpiringVerifications(this.EXPIRATION_WARNING_DAYS),
      extendedRepo.findExpiredVerifications(),
    ]);

    return {
      total: expiringSoon.length + expired.length,
      expiringSoon: expiringSoon.length,
      expired: expired.length,
      verificationWindowDays: VERIFICATION_WINDOW,
    };
  }
}

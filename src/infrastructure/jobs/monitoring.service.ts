import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VerifyProviderUseCase } from '../../application/use-cases/verify-provider.use-case';
import type { IVerificationRepository } from '../../domain/ports/verification-repository.port';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    private readonly verifyUseCase: VerifyProviderUseCase,
    @Inject('VerificationRepository')
    private readonly repository: IVerificationRepository,
  ) {}

  // Running every 10 seconds for DEMO purposes.
  // In production, use CronExpression.EVERY_DAY_AT_MIDNIGHT
  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleCron() {
    this.logger.debug('Starting Daily Verification Job...');

    const providers = await this.repository.findVerifiedProviders();
    this.logger.log(`Found ${providers.length} active providers to re-verify.`);

    for (const provider of providers) {
      this.logger.log(`Re-verifying ${provider.providerId}...`);
      // We re-run the exact same Use Case.
      // This will create a NEW audit log entry with the current timestamp.
      await this.verifyUseCase.execute(provider);
    }
  }
}

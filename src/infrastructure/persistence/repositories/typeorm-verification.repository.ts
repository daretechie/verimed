import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { IVerificationRepository } from '../../../domain/ports/verification-repository.port';
import { VerificationLogEntity } from '../entities/verification-log.entity';
import { VerificationRequest } from '../../../domain/entities/verification-request.entity';
import { VerificationResult } from '../../../domain/entities/verification-result.entity';
import {
  VerificationStatus,
  VerificationMethod,
} from '../../../domain/enums/verification-status.enum';

@Injectable()
export class TypeOrmVerificationRepository implements IVerificationRepository {
  constructor(
    @InjectRepository(VerificationLogEntity)
    private readonly repo: Repository<VerificationLogEntity>,
  ) {}

  async save(
    request: VerificationRequest,
    result: VerificationResult,
  ): Promise<string> {
    // Calculate expiration date (120 days from now)
    const expiresAt = VerificationLogEntity.calculateExpirationDate(
      result.timestamp,
    );

    // Determine verification source based on method
    const verificationSource =
      result.method === VerificationMethod.API_REGISTRY
        ? 'PRIMARY_SOURCE'
        : 'DOCUMENT_AI';

    const log = this.repo.create({
      providerId: request.providerId,
      countryCode: request.countryCode,
      status: result.status,
      method: result.method,
      confidenceScore: result.confidenceScore,
      attributes: request.attributes as Record<string, unknown>,
      metadata: result.metadata as Record<string, unknown>,
      timestamp: result.timestamp,
      expiresAt,
      verificationSource,
    });

    const saved = await this.repo.save(log);
    return saved.id;
  }

  async findById(transactionId: string): Promise<VerificationResult | null> {
    const log = await this.repo.findOneBy({ id: transactionId });

    if (!log) return null;

    return new VerificationResult(
      log.status as VerificationStatus,
      log.method as VerificationMethod,
      log.timestamp,
      log.metadata,
      log.confidenceScore,
      log.id,
    );
  }

  async updateStatus(
    id: string,
    status: VerificationStatus,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const log = await this.repo.findOneBy({ id });

    if (log) {
      log.status = status;
      log.metadata = { ...(log.metadata || {}), ...metadata };
      await this.repo.save(log);
    }
  }

  async findVerifiedProviders(): Promise<VerificationRequest[]> {
    const logs = await this.repo.find({
      where: { status: VerificationStatus.VERIFIED },
    });

    return logs.map(
      (log) =>
        new VerificationRequest(
          log.providerId,
          log.countryCode,
          log.attributes as {
            firstName: string;
            lastName: string;
            licenseNumber: string;
          },
          [],
        ),
    );
  }

  /**
   * Find verifications expiring within the specified number of days
   * Used for proactive re-verification alerts
   */
  async findExpiringVerifications(
    daysUntilExpiration: number = 30,
  ): Promise<VerificationLogEntity[]> {
    const now = new Date();
    const expirationThreshold = new Date(
      now.getTime() + daysUntilExpiration * 24 * 60 * 60 * 1000,
    );

    return this.repo.find({
      where: {
        status: VerificationStatus.VERIFIED,
        expiresAt: LessThan(expirationThreshold),
      },
      order: { expiresAt: 'ASC' },
    });
  }

  /**
   * Find all expired verifications (past 120-day window)
   */
  async findExpiredVerifications(): Promise<VerificationLogEntity[]> {
    return this.repo.find({
      where: {
        status: VerificationStatus.VERIFIED,
        expiresAt: LessThan(new Date()),
      },
      order: { expiresAt: 'ASC' },
    });
  }

  /**
   * Find the latest verification for a provider
   */
  async findLatestForProvider(
    providerId: string,
  ): Promise<VerificationLogEntity | null> {
    return this.repo.findOne({
      where: { providerId },
      order: { timestamp: 'DESC' },
    });
  }

  /**
   * Check if a provider needs re-verification (past 120-day window or expiring soon)
   */
  async needsReverification(
    providerId: string,
    warningDays: number = 14,
  ): Promise<{ needsReverification: boolean; daysRemaining: number | null }> {
    const latest = await this.findLatestForProvider(providerId);

    if (!latest || latest.status !== (VerificationStatus.VERIFIED as string)) {
      return { needsReverification: true, daysRemaining: null };
    }

    const daysRemaining = latest.getDaysUntilExpiration();

    return {
      needsReverification: daysRemaining <= warningDays,
      daysRemaining,
    };
  }
}

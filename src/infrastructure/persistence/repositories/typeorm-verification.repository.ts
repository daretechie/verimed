/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IVerificationRepository } from '../../../domain/ports/verification-repository.port';
import { VerificationLogEntity } from '../entities/verification-log.entity';
import { VerificationRequest } from '../../../domain/entities/verification-request.entity';
import { VerificationResult } from '../../../domain/entities/verification-result.entity';
import { VerificationStatus } from '../../../domain/enums/verification-status.enum';

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
    const log = this.repo.create({
      providerId: request.providerId,
      countryCode: request.countryCode,
      status: result.status,
      method: result.method,
      confidenceScore: result.confidenceScore,
      attributes: request.attributes as Record<string, any>,
      metadata: result.metadata,
      timestamp: result.timestamp,
    });

    const saved = await this.repo.save(log);
    return saved.id;
  }

  async findById(transactionId: string): Promise<VerificationResult | null> {
    const log = await this.repo.findOneBy({ id: transactionId });

    if (!log) return null;

    return new VerificationResult(
      log.status as any,
      log.method as any,
      log.timestamp,
      log.metadata,
      log.confidenceScore,
      log.id,
    );
  }

  async updateStatus(
    id: string,
    status: VerificationStatus,
    metadata: Record<string, any>,
  ): Promise<void> {
    const log = await this.repo.findOneBy({ id });

    if (log) {
      log.status = status;
      log.metadata = { ...log.metadata, ...metadata };
      await this.repo.save(log);
    }
  }

  async findVerifiedProviders(): Promise<VerificationRequest[]> {
    // In a real app, you would group by providerId to get the latest status.
    // Here we just fetch all logs that are marked VERIFIED.
    const logs = await this.repo.find({
      where: { status: VerificationStatus.VERIFIED },
    });

    return logs.map(
      (log) =>
        new VerificationRequest(
          log.providerId,
          log.countryCode,
          log.attributes as any,
          [], // We don't store documents for re-verification
        ),
    );
  }
}

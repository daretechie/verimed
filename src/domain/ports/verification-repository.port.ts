import { VerificationRequest } from '../entities/verification-request.entity';
import { VerificationResult } from '../entities/verification-result.entity';
import { VerificationStatus } from '../enums/verification-status.enum';

export interface IVerificationRepository {
  save(
    request: VerificationRequest,
    result: VerificationResult,
  ): Promise<string>;
  findById(transactionId: string): Promise<VerificationResult | null>;
  updateStatus(
    id: string,
    status: VerificationStatus,
    metadata: Record<string, any>,
  ): Promise<void>;
  findVerifiedProviders(): Promise<VerificationRequest[]>;
}

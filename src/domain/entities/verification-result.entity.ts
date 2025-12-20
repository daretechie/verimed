import {
  VerificationMethod,
  VerificationStatus,
} from '../enums/verification-status.enum';

export class VerificationResult {
  constructor(
    public readonly status: VerificationStatus,
    public readonly method: VerificationMethod,
    public readonly timestamp: Date,
    public readonly metadata: Record<string, any> = {},
    public readonly confidenceScore: number = 1.0,
    public transactionId?: string,
  ) {}
}

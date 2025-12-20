import { VerificationRequest } from '../entities/verification-request.entity';
import { VerificationResult } from '../entities/verification-result.entity';

export interface IRegistryAdapter {
  supports(countryCode: string): boolean;
  verify(request: VerificationRequest): Promise<VerificationResult>;
}

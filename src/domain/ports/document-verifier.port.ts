import { VerificationRequest } from '../entities/verification-request.entity';
import { VerificationResult } from '../entities/verification-result.entity';

export interface IDocumentVerifier {
  verifyDocuments(request: VerificationRequest): Promise<VerificationResult>;
}

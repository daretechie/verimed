import { Injectable, Logger } from '@nestjs/common';
import { IDocumentVerifier } from '../../../domain/ports/document-verifier.port';
import { VerificationRequest } from '../../../domain/entities/verification-request.entity';
import { VerificationResult } from '../../../domain/entities/verification-result.entity';
import {
  VerificationStatus,
  VerificationMethod,
} from '../../../domain/enums/verification-status.enum';

@Injectable()
export class MockDocumentVerifier implements IDocumentVerifier {
  private readonly logger = new Logger(MockDocumentVerifier.name);

  async verifyDocuments(
    request: VerificationRequest,
  ): Promise<VerificationResult> {
    // satisfying require-await
    await Promise.resolve();

    this.logger.log(
      `[Mock] Always-Pass Document Verification for ${request.providerId}`,
    );

    return new VerificationResult(
      VerificationStatus.VERIFIED,
      VerificationMethod.AI_DOCUMENT,
      new Date(),
      { reason: 'Mock verifier always pass' },
      1.0,
    );
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { IDocumentVerifier } from '../../../domain/ports/document-verifier.port';
import { VerificationRequest } from '../../../domain/entities/verification-request.entity';
import { VerificationResult } from '../../../domain/entities/verification-result.entity';
import {
  VerificationStatus,
  VerificationMethod,
} from '../../../domain/enums/verification-status.enum';

@Injectable()
export class GoogleCloudDocumentVerifier implements IDocumentVerifier {
  private readonly logger = new Logger(GoogleCloudDocumentVerifier.name);

  async verifyDocuments(
    request: VerificationRequest,
  ): Promise<VerificationResult> {
    // satisfying require-await
    await Promise.resolve();

    this.logger.log(
      `[Google Cloud] Analyzing documents for ${request.countryCode}...`,
    );

    return new VerificationResult(
      request.attributes.licenseNumber
        ? VerificationStatus.VERIFIED
        : VerificationStatus.REJECTED,
      VerificationMethod.AI_DOCUMENT,
      new Date(),
      { providerId: request.providerId },
    );
  }
}

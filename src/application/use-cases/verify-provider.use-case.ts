import { Injectable, Inject, Logger } from '@nestjs/common';
import { VerificationRequest } from '../../domain/entities/verification-request.entity';
import { VerificationResult } from '../../domain/entities/verification-result.entity';
import type { IRegistryAdapter } from '../../domain/ports/registry-adapter.port';
import type { IDocumentVerifier } from '../../domain/ports/document-verifier.port';
import type { IVerificationRepository } from '../../domain/ports/verification-repository.port';
import {
  VerificationStatus,
  VerificationMethod,
} from '../../domain/enums/verification-status.enum';

@Injectable()
export class VerifyProviderUseCase {
  private readonly logger = new Logger(VerifyProviderUseCase.name);

  constructor(
    @Inject('RegistryAdapters')
    private readonly registryAdapters: IRegistryAdapter[],
    @Inject('DocumentVerifier')
    private readonly documentVerifier: IDocumentVerifier,
    @Inject('VerificationRepository')
    private readonly repository: IVerificationRepository,
  ) {}

  async execute(request: VerificationRequest): Promise<VerificationResult> {
    this.logger.log(
      `Starting verification for provider: ${request.providerId}`,
    );

    const adapter = this.registryAdapters.find((a) =>
      a.supports(request.countryCode),
    );

    let registryResult: VerificationResult;

    try {
      if (adapter) {
        registryResult = await adapter.verify(request);
      } else {
        this.logger.warn(
          `No registry adapter found for country: ${request.countryCode}. Falling back to document only.`,
        );
        registryResult = new VerificationResult(
          VerificationStatus.MANUAL_REVIEW,
          VerificationMethod.AI_DOCUMENT, // Default method when no registry
          new Date(),
          { reason: 'No registry found for country' },
        );
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Registry adapter failed: ${errorMessage}. Falling back to documents.`,
      );
      registryResult = new VerificationResult(
        VerificationStatus.PENDING,
        VerificationMethod.API_REGISTRY,
        new Date(),
        { error: 'Registry Unreachable', details: errorMessage },
      );
    }

    // if registry not definitive, verify documents
    if (registryResult.status !== VerificationStatus.VERIFIED) {
      const docResult = await this.documentVerifier.verifyDocuments(request);

      // logic: if documents are verified, but registry failed (or was unreachable), we might want to manually review
      if (
        docResult.status === VerificationStatus.VERIFIED &&
        (registryResult.status === VerificationStatus.REJECTED ||
          registryResult.status === VerificationStatus.PENDING)
      ) {
        // Upgrade to manual review
        registryResult = new VerificationResult(
          VerificationStatus.MANUAL_REVIEW,
          registryResult.method,
          new Date(),
          {
            ...registryResult.metadata,
            docVerification: 'PASSED',
            docConfidence: docResult.confidenceScore,
            aiReason: docResult.metadata?.aiReason as string | undefined,
          },
        );
      } else if (registryResult.status === VerificationStatus.PENDING) {
        // If registry was unreachable and docs didn't pass, we should probably output the doc result?
        registryResult = docResult;
      }
    }

    // Save result
    const transactionId = await this.repository.save(request, registryResult);
    registryResult.transactionId = transactionId;

    return registryResult;
  }
}

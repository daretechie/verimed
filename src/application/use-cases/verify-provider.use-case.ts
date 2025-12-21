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
        // Country has official API - use primary source verification
        registryResult = await adapter.verify(request);
      } else {
        // No official API for this country - document required
        const hasDocuments =
          request.documents.length > 0 || request.idDocument !== undefined;

        if (!hasDocuments) {
          // REJECT: Unsupported country without document upload
          this.logger.warn(
            `Country ${request.countryCode} not supported and no documents provided.`,
          );
          registryResult = new VerificationResult(
            VerificationStatus.REJECTED,
            VerificationMethod.AI_DOCUMENT,
            new Date(),
            {
              reason: 'Document required for unsupported country',
              countryCode: request.countryCode,
              supportedCountries: ['US', 'FR', 'AE', 'NL', 'IL'],
              hint: 'Please upload a medical license/certificate document',
            },
          );

          // Save and return early - no further processing needed
          const transactionId = await this.repository.save(
            request,
            registryResult,
          );
          registryResult.transactionId = transactionId;
          return registryResult;
        }

        // Documents provided - proceed with AI verification
        this.logger.log(
          `No registry adapter for ${request.countryCode}. Processing with AI document verification.`,
        );
        registryResult = new VerificationResult(
          VerificationStatus.PENDING,
          VerificationMethod.AI_DOCUMENT,
          new Date(),
          { reason: 'Unsupported country - AI document verification' },
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

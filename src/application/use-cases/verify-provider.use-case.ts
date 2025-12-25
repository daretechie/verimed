import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VerificationRequest } from '../../domain/entities/verification-request.entity';
import { VerificationResult } from '../../domain/entities/verification-result.entity';
import type { IRegistryAdapter } from '../../domain/ports/registry-adapter.port';
import type { IDocumentVerifier } from '../../domain/ports/document-verifier.port';
import type { IVerificationRepository } from '../../domain/ports/verification-repository.port';
import {
  VerificationStatus,
  VerificationMethod,
} from '../../domain/enums/verification-status.enum';
import { AIAuditService } from '../../infrastructure/services/ai-audit.service';

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
    private readonly config: ConfigService,
    @Optional() private readonly aiAudit?: AIAuditService,
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
          docResult.confidenceScore,
        );
      } else if (registryResult.status === VerificationStatus.PENDING) {
        // If registry was unreachable and docs didn't pass, we should probably output the doc result?
        registryResult = docResult;
      }

      // 4. Force Manual Review if confidence is below threshold
      const threshold =
        this.config.get<number>('AI_CONFIDENCE_THRESHOLD') || 0.85;
      if (
        registryResult.method === VerificationMethod.AI_DOCUMENT &&
        registryResult.confidenceScore < threshold
      ) {
        this.logger.warn(
          `AI confidence ${registryResult.confidenceScore} is below threshold ${threshold}. Tagging as lowConfidence.`,
        );

        // Ensure status is at least MANUAL_REVIEW
        const finalStatus =
          registryResult.status === VerificationStatus.REJECTED
            ? VerificationStatus.REJECTED
            : VerificationStatus.MANUAL_REVIEW;

        registryResult = new VerificationResult(
          finalStatus,
          registryResult.method,
          new Date(),
          {
            ...registryResult.metadata,
            originalStatus: registryResult.status,
            lowConfidence: true,
          },
          registryResult.confidenceScore,
        );
      }
    }

    // Save result
    const transactionId = await this.repository.save(request, registryResult);
    registryResult.transactionId = transactionId;

    // Log AI decision for bias monitoring (fire-and-forget)
    if (
      this.aiAudit &&
      registryResult.method === VerificationMethod.AI_DOCUMENT
    ) {
      this.aiAudit
        .logDecision({
          countryCode: request.countryCode,
          status: registryResult.status,
          confidenceScore: registryResult.confidenceScore,
          model: registryResult.metadata?.rawAiResponse?.model || 'unknown',
          providerId: request.providerId,
          isFromCache: !!registryResult.metadata?.fromCache,
        })
        .catch((err) => {
          this.logger.warn(`Failed to log AI audit: ${err}`);
        });
    }

    return registryResult;
  }
}

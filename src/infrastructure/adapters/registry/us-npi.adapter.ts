/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { FuzzyMatcher } from '../../../common/utils/fuzzy-matcher.util';
import { IRegistryAdapter } from '../../../domain/ports/registry-adapter.port';
import { ResilienceService } from '../../services/resilience.service';
import { VerificationRequest } from '../../../domain/entities/verification-request.entity';
import { VerificationResult } from '../../../domain/entities/verification-result.entity';
import {
  VerificationStatus,
  VerificationMethod,
} from '../../../domain/enums/verification-status.enum';

@Injectable()
export class UsNpiRegistryAdapter implements IRegistryAdapter {
  private readonly logger = new Logger(UsNpiRegistryAdapter.name);

  constructor(private readonly resilience: ResilienceService) {}

  supports(countryCode: string): boolean {
    return countryCode === 'US';
  }

  async verify(request: VerificationRequest): Promise<VerificationResult> {
    this.logger.log(
      `Checking NPI Registry for ${request.attributes.licenseNumber}...`,
    );

    const apiUrl = `https://npiregistry.cms.hhs.gov/api/?version=2.1&number=${request.attributes.licenseNumber}`;

    try {
      // Use Circuit Breaker to prevent cascading failures
      const response = await this.resilience.execute('US_NPI', () =>
        axios.get(apiUrl),
      );

      if (response.data.result_count === 0) {
        return new VerificationResult(
          VerificationStatus.REJECTED,
          VerificationMethod.API_REGISTRY,
          new Date(),
          { reason: 'NPI not found in CMS registry' },
        );
      }
      // ... same logic ..
      const providerData = response.data.results[0];
      const registryFirstName = providerData.basic.first_name;
      const registryLastName = providerData.basic.last_name;

      // Innovation: Fuzzy Name Matching (Standardized)
      const fullNameRegistry = `${registryFirstName} ${registryLastName}`;
      const fullNameInput = `${request.attributes.firstName} ${request.attributes.lastName}`;

      // Use the shared utility
      const matchScore = FuzzyMatcher.calculateNameMatch(
        fullNameInput,
        fullNameRegistry,
      );

      const isMatch = matchScore >= 0.6; // 60% confidence threshold

      if (!isMatch) {
        return new VerificationResult(
          VerificationStatus.MANUAL_REVIEW,
          VerificationMethod.API_REGISTRY,
          new Date(),
          {
            reason: 'Name mismatch with registry',
            provided: fullNameInput,
            registry: fullNameRegistry,
            confidence: matchScore,
          },
          matchScore,
        );
      }

      return new VerificationResult(
        VerificationStatus.VERIFIED,
        VerificationMethod.API_REGISTRY,
        new Date(),
        {
          source: 'NPPES_API',
          npi: providerData.number,
          providerName: `${registryFirstName} ${registryLastName}`,
          matchScore,
          lastUpdated: providerData.basic.last_updated,
        },
      );
    } catch (error) {
      // If Circuit Breaker is OPEN, error will come from Opossum
      this.logger.error('Error connecting to NPI Registry', error);

      const isCircuitOpen = (error as Error).message?.includes(
        'Breaker is open',
      );

      // GRACEFUL DEGRADATION: Return PENDING instead of crashing
      // This allows the request to be retried later or escalated to AI/manual verification
      if (isCircuitOpen) {
        this.logger.warn(
          '[GRACEFUL DEGRADATION] Circuit open, returning PENDING status',
        );
        return new VerificationResult(
          VerificationStatus.PENDING,
          VerificationMethod.API_REGISTRY,
          new Date(),
          {
            reason: 'Registry temporarily unavailable (circuit breaker open)',
            retryAfter: '10s',
          },
          0,
        );
      }

      const msg = axios.isAxiosError(error)
        ? `Upstream API Error: ${error.message}`
        : `Registry Unavailable: ${(error as Error).message}`;

      throw new HttpException(msg, HttpStatus.BAD_GATEWAY);
    }
  }
}

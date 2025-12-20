/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { FuzzyMatcher } from '../../../common/utils/fuzzy-matcher.util';
import { IRegistryAdapter } from '../../../domain/ports/registry-adapter.port';
import { VerificationRequest } from '../../../domain/entities/verification-request.entity';
import { VerificationResult } from '../../../domain/entities/verification-result.entity';
import {
  VerificationStatus,
  VerificationMethod,
} from '../../../domain/enums/verification-status.enum';

@Injectable()
export class UsNpiRegistryAdapter implements IRegistryAdapter {
  private readonly logger = new Logger(UsNpiRegistryAdapter.name);

  supports(countryCode: string): boolean {
    return countryCode === 'US';
  }

  async verify(request: VerificationRequest): Promise<VerificationResult> {
    this.logger.log(
      `Checking NPI Registry for ${request.attributes.licenseNumber}...`,
    );

    // The Official CMS NPI Registry API (Public & Free)
    // Version 2.1
    const apiUrl = `https://npiregistry.cms.hhs.gov/api/?version=2.1&number=${request.attributes.licenseNumber}`;

    try {
      const response = await axios.get(apiUrl);

      if (response.data.result_count === 0) {
        return new VerificationResult(
          VerificationStatus.REJECTED,
          VerificationMethod.API_REGISTRY,
          new Date(),
          { reason: 'NPI not found in CMS registry' },
        );
      }

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
      this.logger.error('Error connecting to NPI Registry', error);

      const msg = axios.isAxiosError(error)
        ? `Upstream API Error: ${error.message}`
        : 'External Registry Unavailable';

      throw new HttpException(msg, HttpStatus.BAD_GATEWAY);
    }
  }
}

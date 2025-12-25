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

/**
 * 🇿🇦 South Africa - HPCSA (Health Professions Council of South Africa)
 *
 * Registry Type: Centralized national register
 * API: Public search available at https://isystems.hpcsa.co.za/iregister/
 * Reference: https://www.hpcsa.co.za
 *
 * License Format: MP/MPS followed by numbers (e.g., MP0123456)
 */
@Injectable()
export class ZaHpcsaRegistryAdapter implements IRegistryAdapter {
  private readonly logger = new Logger(ZaHpcsaRegistryAdapter.name);
  private readonly HPCSA_SEARCH_URL =
    'https://isystems.hpcsa.co.za/iregister/RegisterSearch.aspx';

  constructor(private readonly resilience: ResilienceService) {}

  supports(countryCode: string): boolean {
    return countryCode === 'ZA';
  }

  async verify(request: VerificationRequest): Promise<VerificationResult> {
    this.logger.log(
      `Checking HPCSA Registry for ${request.attributes.licenseNumber}...`,
    );

    const licenseNumber = request.attributes.licenseNumber;

    // Validate SA license format (MP/MPS + digits)
    const saLicensePattern = /^(MP|MPS)\d{5,10}$/i;
    if (!saLicensePattern.test(licenseNumber)) {
      return new VerificationResult(
        VerificationStatus.REJECTED,
        VerificationMethod.API_REGISTRY,
        new Date(),
        {
          reason: 'Invalid South African HPCSA license format',
          expectedFormat: 'MP0123456 or MPS0123456',
          provided: licenseNumber,
        },
        0,
      );
    }

    try {
      // HPCSA has a public search but no REST API
      // In production, this would use web scraping or official API partnership

      // Placeholder verification using the iRegister system
      this.logger.log('[ZA] Querying HPCSA iRegister...');

      // Since we can't actually query without proper integration,
      // return manual review for now
      return new VerificationResult(
        VerificationStatus.MANUAL_REVIEW,
        VerificationMethod.API_REGISTRY,
        new Date(),
        {
          reason: 'HPCSA verification requires manual portal check',
          verificationUrl: this.HPCSA_SEARCH_URL,
          providedLicense: licenseNumber,
          suggestedAction: 'Search iRegister portal manually',
        },
        0,
      );
    } catch (error) {
      this.logger.error('Error checking HPCSA registry', error);
      throw new HttpException(
        'South Africa HPCSA Registry Unavailable',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}

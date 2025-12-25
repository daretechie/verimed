import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { IRegistryAdapter } from '../../../domain/ports/registry-adapter.port';
import { ResilienceService } from '../../services/resilience.service';
import { VerificationRequest } from '../../../domain/entities/verification-request.entity';
import { VerificationResult } from '../../../domain/entities/verification-result.entity';
import {
  VerificationStatus,
  VerificationMethod,
} from '../../../domain/enums/verification-status.enum';

/**
 * 🇬🇧 United Kingdom - General Medical Council (GMC)
 *
 * Registry Type: Centralized national register
 * Website: https://www.gmc-uk.org
 * Register: https://www.gmc-uk.org/registration-and-licensing/the-medical-register
 *
 * API Status: No public API available
 * - Online search available at GMC website
 * - Bulk data download available (paid subscription)
 * - Third-party integrations via DataFlow Group
 *
 * License Format: GMC Reference Number (7 digits)
 * Example: 1234567
 *
 * Note: The GMC maintains the official register of medical practitioners
 * licensed to practice in the UK. All doctors must be registered with
 * a licence to practise to work as a doctor in the UK.
 */
@Injectable()
export class GbGmcRegistryAdapter implements IRegistryAdapter {
  private readonly logger = new Logger(GbGmcRegistryAdapter.name);
  private readonly GMC_SEARCH_URL =
    'https://www.gmc-uk.org/registration-and-licensing/the-medical-register/a-]to-z-list-of-registered-doctors';
  private readonly GMC_REGISTER_URL =
    'https://www.gmc-uk.org/registration-and-licensing/the-medical-register';

  constructor(private readonly resilience: ResilienceService) {}

  supports(countryCode: string): boolean {
    return countryCode === 'GB' || countryCode === 'UK';
  }

  async verify(request: VerificationRequest): Promise<VerificationResult> {
    this.logger.log(`Verifying UK provider: ${request.attributes.licenseNumber}`);
    
    // Simulate async work
    await Promise.resolve();

    const licenseNumber = request.attributes.licenseNumber;

    // Validate UK GMC number format (7 digits)
    // GMC reference numbers are always exactly 7 digits
    const gmcPattern = /^\d{7}$/;

    if (!gmcPattern.test(licenseNumber)) {
      return new VerificationResult(
        VerificationStatus.REJECTED,
        VerificationMethod.API_REGISTRY,
        new Date(),
        {
          reason: 'Invalid UK GMC reference number format',
          expectedFormat: '7 digits (e.g., 1234567)',
          provided: licenseNumber,
          note: 'GMC reference numbers are exactly 7 digits with no prefix',
        },
        0,
      );
    }

    try {
      // GMC does not provide a public API
      // In production, options are:
      // 1. Subscribe to GMC downloadable register (paid)
      // 2. Partner with DataFlow Group
      // 3. Use web scraping (with appropriate permissions)

      this.logger.log(
        `[GB] GMC number ${licenseNumber} - format valid, manual verification required`,
      );

      return new VerificationResult(
        VerificationStatus.MANUAL_REVIEW,
        VerificationMethod.API_REGISTRY,
        new Date(),
        {
          reason: 'GMC does not provide a public verification API',
          verificationUrl: this.GMC_REGISTER_URL,
          gmcNumber: licenseNumber,
          providerName: `${request.attributes.firstName} ${request.attributes.lastName}`,
          suggestedAction: 'Search GMC Medical Register manually',
          searchUrl: `https://www.gmc-uk.org/registration-and-licensing/the-medical-register?pc=*&sn=${encodeURIComponent(request.attributes.lastName)}&fn=${encodeURIComponent(request.attributes.firstName)}`,
          notes: [
            'UK doctors must hold GMC registration with a licence to practise',
            'The GMC Medical Register is searchable online',
            'Third-party verification available via DataFlow Group',
          ],
        },
        0,
      );
    } catch (error) {
      this.logger.error('Error checking GMC registry', error);
      throw new HttpException(
        'UK GMC Registry Unavailable',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}

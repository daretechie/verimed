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

/**
 * UAE - Dubai Health Authority (DHA) Registry Adapter
 *
 * LIVE API INTEGRATION
 * Source: Dubai Pulse Open Data Portal
 * API: https://www.dubaipulse.gov.ae/
 * Dataset: dha_sheryan_professional_detail-open-api
 *
 * Note: The API provides details of active health professionals in Dubai.
 * Access may require registration at the Dubai Digital portal.
 */
@Injectable()
export class AeDhaRegistryAdapter implements IRegistryAdapter {
  private readonly logger = new Logger(AeDhaRegistryAdapter.name);
  // Dubai Pulse API endpoint (example - actual endpoint may vary)
  private readonly API_BASE =
    'https://data.dubaipulse.gov.ae/api/records/1.0/search/';

  supports(countryCode: string): boolean {
    return countryCode === 'AE';
  }

  async verify(request: VerificationRequest): Promise<VerificationResult> {
    const dhaLicense = request.attributes.licenseNumber;
    this.logger.log(`[AE DHA] Checking Dubai Pulse for License: ${dhaLicense}`);

    // DHA License format validation
    if (!/^DHA-[A-Z]?-?\d{6,10}$/i.test(dhaLicense)) {
      return new VerificationResult(
        VerificationStatus.REJECTED,
        VerificationMethod.API_REGISTRY,
        new Date(),
        { reason: 'Invalid DHA license format. Expected format: DHA-XXXXXX' },
      );
    }

    try {
      // Query the Dubai Pulse API
      const response = await axios.get(this.API_BASE, {
        params: {
          dataset: 'dha-sheryan-professional-detail',
          q: `license_number:${dhaLicense}`,
          rows: 1,
        },
        timeout: 10000,
      });

      const records = response.data?.records;

      if (!records || records.length === 0) {
        return new VerificationResult(
          VerificationStatus.REJECTED,
          VerificationMethod.API_REGISTRY,
          new Date(),
          {
            reason: 'DHA license not found in Dubai Pulse registry',
            dhaLicense,
          },
        );
      }

      const professional = records[0].fields;

      // Standardized Fuzzy Matching
      const providerName = String(professional.professional_name || 'Unknown');
      const inputName = `${request.attributes.firstName} ${request.attributes.lastName}`;

      if (!FuzzyMatcher.isMatch(inputName, providerName)) {
        return new VerificationResult(
          VerificationStatus.MANUAL_REVIEW,
          VerificationMethod.API_REGISTRY,
          new Date(),
          {
            reason: 'Name mismatch with registry',
            provided: inputName,
            registry: providerName,
          },
          FuzzyMatcher.calculateNameMatch(inputName, providerName),
        );
      }

      return new VerificationResult(
        VerificationStatus.VERIFIED,
        VerificationMethod.API_REGISTRY,
        new Date(),
        {
          source: 'DUBAI_PULSE_API',
          dhaLicense,
          providerName,
          specialty: professional.specialty || 'N/A',
          facilityName: professional.facility_name || 'N/A',
          status: professional.status || 'Active',
        },
      );
    } catch (error) {
      this.logger.error('Error connecting to Dubai Pulse API', error);

      // If API is unavailable or requires auth, fall back to manual review
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return new VerificationResult(
          VerificationStatus.MANUAL_REVIEW,
          VerificationMethod.API_REGISTRY,
          new Date(),
          {
            reason: 'Dubai Pulse API requires authentication',
            dhaLicense,
            note: 'Register at Dubai Digital portal for API access',
          },
        );
      }

      const msg = axios.isAxiosError(error)
        ? `Upstream API Error: ${error.message}`
        : 'UAE Registry Unavailable';

      throw new HttpException(msg, HttpStatus.BAD_GATEWAY);
    }
  }
}

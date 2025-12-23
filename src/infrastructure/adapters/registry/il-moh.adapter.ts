/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
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
 * Israel - Ministry of Health (MOH) Registry Adapter
 *
 * LIVE API INTEGRATION
 * Source: Israel Government Data Portal (data.gov.il)
 * API: CKAN API
 * Resource ID: 9c64c522-bbc2-48fe-96fb-3b2a8626f59e (Physicians Licenses Database)
 * Dataset: https://data.gov.il/dataset/ministry-health/database-of-doctors-licenses-moh
 * Documentation: https://data.gov.il/dataset/physicians-database
 */
@Injectable()
export class IlMohRegistryAdapter implements IRegistryAdapter {
  private readonly logger = new Logger(IlMohRegistryAdapter.name);
  private readonly API_ENDPOINT =
    'https://data.gov.il/api/3/action/datastore_search';
  // Verified resource ID (as of December 2025)
  private readonly RESOURCE_ID = '9c64c522-bbc2-48fe-96fb-3b2a8626f59e';

  supports(countryCode: string): boolean {
    return countryCode === 'IL';
  }

  async verify(request: VerificationRequest): Promise<VerificationResult> {
    const licenseNumber = request.attributes.licenseNumber;
    this.logger.log(
      `[IL MOH] Checking Physicians Database for License#: ${licenseNumber}`,
    );

    // Israel medical license numbers are usually 5-6 digits
    if (!/^\d{5,7}$/.test(licenseNumber)) {
      return new VerificationResult(
        VerificationStatus.REJECTED,
        VerificationMethod.API_REGISTRY,
        new Date(),
        {
          reason: 'Invalid Israel medical license format. Expected 5-7 digits.',
        },
      );
    }

    try {
      // Query the CKAN datastore
      const response = await axios.get(this.API_ENDPOINT, {
        params: {
          resource_id: this.RESOURCE_ID,
          // We search for the license number in the 'מס' רישיון' column (number of license)
          // or generic search if columns are unknown at runtime.
          q: licenseNumber,
        },
        timeout: 10000,
      });

      const records = response.data?.result?.records;

      if (!records || records.length === 0) {
        return new VerificationResult(
          VerificationStatus.REJECTED,
          VerificationMethod.API_REGISTRY,
          new Date(),
          {
            reason: 'Medical license not found in MOH database',
            licenseNumber,
          },
        );
      }

      // Find the exact match (CKAN 'q' is a fuzzy/broad search)
      const exactMatch = records.find(
        (r: any) =>
          String(r["מס' רישיון"]) === licenseNumber ||
          String(r['LicenseNumber']) === licenseNumber,
      );

      if (!exactMatch) {
        return new VerificationResult(
          VerificationStatus.REJECTED,
          VerificationMethod.API_REGISTRY,
          new Date(),
          { reason: 'No exact license number match found', licenseNumber },
        );
      }

      // Standardized Fuzzy Matching
      const providerName =
        `${exactMatch['שם פרטי']} ${exactMatch['שם משפחה']}`.trim() ||
        'Unknown';
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
          source: 'ISRAEL_MOH_DATA_GOV_IL',
          licenseNumber,
          providerName,
          specialty: exactMatch['תואר מומחיות'] || 'N/A',
          status: 'Active',
        },
      );
    } catch (error) {
      this.logger.error('Error connecting to Israel MOH API', error);

      const msg = axios.isAxiosError(error)
        ? `Upstream API Error: ${error.message}`
        : 'Israel Registry Unavailable';

      throw new HttpException(msg, HttpStatus.BAD_GATEWAY);
    }
  }
}

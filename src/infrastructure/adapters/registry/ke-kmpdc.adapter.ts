/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
 * Kenya - KMPDC (Kenya Medical Practitioners and Dentists Council) Adapter
 *
 * LIVE API INTEGRATION
 * Source: KMPDC via Intellex Platform
 * API: https://intellex.dev (requires API key)
 * Documentation: https://intellex.dev/apis/kenya-local-medical-dental-practitioners-registrar-register
 *
 * Provides access to registered medical and dental practitioners in Kenya.
 * Requires INTELLEX_API_KEY environment variable.
 */
@Injectable()
export class KeKmpdcRegistryAdapter implements IRegistryAdapter {
  private readonly logger = new Logger(KeKmpdcRegistryAdapter.name);
  private readonly API_BASE = 'https://api.intellex.dev/v1';

  constructor(private readonly configService: ConfigService) {}

  supports(countryCode: string): boolean {
    return countryCode === 'KE';
  }

  async verify(request: VerificationRequest): Promise<VerificationResult> {
    const registrationNumber = request.attributes.licenseNumber;
    this.logger.log(
      `[KE KMPDC] Checking Intellex API for Reg#: ${registrationNumber}`,
    );

    const apiKey = this.configService.get<string>('INTELLEX_API_KEY');

    // If no API key, return manual review
    if (!apiKey) {
      return new VerificationResult(
        VerificationStatus.MANUAL_REVIEW,
        VerificationMethod.API_REGISTRY,
        new Date(),
        {
          reason: 'INTELLEX_API_KEY not configured',
          registrationNumber,
          note: 'Get API key from https://intellex.dev',
        },
      );
    }

    try {
      const response = await axios.get(`${this.API_BASE}/kmpdc/practitioners`, {
        params: { registration_number: registrationNumber },
        headers: {
          'x-api-key': apiKey,
          Accept: 'application/json',
        },
        timeout: 10000,
      });

      const data = response.data;

      if (!data || !data.practitioner) {
        return new VerificationResult(
          VerificationStatus.REJECTED,
          VerificationMethod.API_REGISTRY,
          new Date(),
          {
            reason: 'Registration number not found in KMPDC registry',
            registrationNumber,
          },
        );
      }

      const practitioner = data.practitioner;

      // Standardized Fuzzy Matching
      const providerName = String(practitioner.name || 'Unknown');
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
          source: 'KMPDC_INTELLEX',
          registrationNumber,
          providerName,
          qualifications: practitioner.qualifications || [],
          specialty: practitioner.specialty || 'N/A',
          status: practitioner.status || 'Active',
        },
      );
    } catch (error) {
      this.logger.error('Error connecting to KMPDC Intellex API', error);

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return new VerificationResult(
          VerificationStatus.MANUAL_REVIEW,
          VerificationMethod.API_REGISTRY,
          new Date(),
          {
            reason: 'Invalid INTELLEX_API_KEY',
            registrationNumber,
          },
        );
      }

      const msg = axios.isAxiosError(error)
        ? `Upstream API Error: ${error.message}`
        : 'Kenya Registry Unavailable';

      throw new HttpException(msg, HttpStatus.BAD_GATEWAY);
    }
  }
}

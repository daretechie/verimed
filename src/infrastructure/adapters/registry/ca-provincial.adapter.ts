import { Injectable, Logger } from '@nestjs/common';
import { IRegistryAdapter } from '../../../domain/ports/registry-adapter.port';
import { ResilienceService } from '../../services/resilience.service';
import { VerificationRequest } from '../../../domain/entities/verification-request.entity';
import { VerificationResult } from '../../../domain/entities/verification-result.entity';
import {
  VerificationStatus,
  VerificationMethod,
} from '../../../domain/enums/verification-status.enum';

/**
 * 🇨🇦 Canada - Provincial Medical Regulatory Authorities
 *
 * Registry Type: Decentralized (13 provinces/territories)
 * Regulatory Bodies: Provincial Colleges of Physicians and Surgeons
 *
 * Major Colleges:
 * - CPSO (Ontario): cpso.on.ca
 * - CPSBC (British Columbia): cpsbc.ca
 * - CPSA (Alberta): cpsa.ca
 * - CMQ (Quebec): cmq.org
 *
 * API Status: No official public APIs
 * - Each province has its own online search portal
 * - Medical Council of Canada developing National Registry of Physicians (NRP)
 *
 * License Format: Province-specific
 * - Ontario (CPSO): 5-6 digit number
 * - British Columbia (CPSBC): 5 digits
 * - Alberta (CPSA): 5-6 digits
 * - Quebec (CMQ): 5-6 digits
 *
 * Note: Doctors must be registered with the appropriate provincial
 * college to practice medicine in that province.
 */
@Injectable()
export class CaProvincialRegistryAdapter implements IRegistryAdapter {
  private readonly logger = new Logger(CaProvincialRegistryAdapter.name);

  /**
   * Provincial college information
   */
  private readonly provinces: Record<
    string,
    {
      name: string;
      code: string;
      college: string;
      searchUrl: string;
      licensePattern: RegExp;
    }
  > = {
    ON: {
      name: 'Ontario',
      code: 'ON',
      college: 'College of Physicians and Surgeons of Ontario (CPSO)',
      searchUrl: 'https://www.cpso.on.ca/Public/Doctor-Search',
      licensePattern: /^\d{5,6}$/,
    },
    BC: {
      name: 'British Columbia',
      code: 'BC',
      college: 'College of Physicians and Surgeons of BC (CPSBC)',
      searchUrl: 'https://www.cpsbc.ca/public/registrant-directory',
      licensePattern: /^\d{5}$/,
    },
    AB: {
      name: 'Alberta',
      code: 'AB',
      college: 'College of Physicians and Surgeons of Alberta (CPSA)',
      searchUrl: 'https://search.cpsa.ca/',
      licensePattern: /^\d{5,6}$/,
    },
    QC: {
      name: 'Quebec',
      code: 'QC',
      college: 'Collège des médecins du Québec (CMQ)',
      searchUrl: 'https://www.cmq.org/bottin/index.aspx',
      licensePattern: /^\d{5,6}$/,
    },
    MB: {
      name: 'Manitoba',
      code: 'MB',
      college: 'College of Physicians and Surgeons of Manitoba (CPSM)',
      searchUrl: 'https://cpsm.mb.ca/physician-search',
      licensePattern: /^\d{5,6}$/,
    },
    SK: {
      name: 'Saskatchewan',
      code: 'SK',
      college: 'College of Physicians and Surgeons of Saskatchewan (CPSS)',
      searchUrl: 'https://www.cps.sk.ca/CPSS/Physician_Search',
      licensePattern: /^\d{5,6}$/,
    },
    NS: {
      name: 'Nova Scotia',
      code: 'NS',
      college: 'College of Physicians and Surgeons of Nova Scotia (CPSNS)',
      searchUrl: 'https://cpsnsphysiciansearch.ca/',
      licensePattern: /^\d{5,6}$/,
    },
    NB: {
      name: 'New Brunswick',
      code: 'NB',
      college: 'College of Physicians and Surgeons of New Brunswick (CPSNB)',
      searchUrl: 'https://cpsnb.alinityapp.com/client/publicdirectory',
      licensePattern: /^\d{5,6}$/,
    },
  };

  constructor(private readonly resilience: ResilienceService) {}

  supports(countryCode: string): boolean {
    return countryCode === 'CA';
  }

  async verify(request: VerificationRequest): Promise<VerificationResult> {
    this.logger.log(
      `Checking Canadian Provincial Registry for ${request.attributes.licenseNumber}...`,
    );

    // Detect province from license number
    const provinceCode = request.attributes.licenseNumber.split('-')[0];
    const province = this.provinces[provinceCode] || 'Unknown';

    // Simulate async work
    await Promise.resolve();
    const licenseNumber = request.attributes.licenseNumber.toUpperCase();

    // Parse license number - expected format: [PROVINCE]-[NUMBER] or just [NUMBER]
    // Examples: ON-123456, BC-12345, 123456
    const parseResult = this.parseLicenseNumber(licenseNumber);

    if (!parseResult) {
      return new VerificationResult(
        VerificationStatus.REJECTED,
        VerificationMethod.API_REGISTRY,
        new Date(),
        {
          reason: 'Invalid Canadian medical license format',
          expectedFormats: [
            'Province prefix: ON-123456, BC-12345, AB-123456',
            'Number only: 123456 (province will be requested)',
          ],
          provided: licenseNumber,
          supportedProvinces: Object.keys(this.provinces).join(', '),
        },
        0,
      );
    }

    const { province, number } = parseResult;

    // If no province specified, we need manual review
    if (!province) {
      return new VerificationResult(
        VerificationStatus.MANUAL_REVIEW,
        VerificationMethod.API_REGISTRY,
        new Date(),
        {
          reason:
            'Province not specified - Canada has 13 medical regulatory authorities',
          providedNumber: number,
          suggestedAction: 'Please include province code (e.g., ON-123456)',
          provinces: Object.entries(this.provinces).map(([code, info]) => ({
            code,
            name: info.name,
            college: info.college,
          })),
        },
        0,
      );
    }

    const provinceInfo = this.provinces[province];

    if (!provinceInfo) {
      return new VerificationResult(
        VerificationStatus.REJECTED,
        VerificationMethod.API_REGISTRY,
        new Date(),
        {
          reason: `Province ${province} not yet supported`,
          supportedProvinces: Object.keys(this.provinces).join(', '),
          provided: licenseNumber,
        },
        0,
      );
    }

    // Validate province-specific format
    if (!provinceInfo.licensePattern.test(number)) {
      return new VerificationResult(
        VerificationStatus.REJECTED,
        VerificationMethod.API_REGISTRY,
        new Date(),
        {
          reason: `Invalid ${provinceInfo.name} license number format`,
          province: provinceInfo.name,
          college: provinceInfo.college,
          provided: number,
        },
        0,
      );
    }

    try {
      // No Canadian province provides a public API
      // Return manual review with direct search link

      this.logger.log(
        `[CA] ${province}-${number} - format valid, manual verification required`,
      );

      return new VerificationResult(
        VerificationStatus.MANUAL_REVIEW,
        VerificationMethod.API_REGISTRY,
        new Date(),
        {
          reason: `${provinceInfo.college} does not provide a public verification API`,
          verificationUrl: provinceInfo.searchUrl,
          province: provinceInfo.name,
          college: provinceInfo.college,
          licenseNumber: number,
          providerName: `${request.attributes.firstName} ${request.attributes.lastName}`,
          suggestedAction: `Search ${provinceInfo.code} physician directory manually`,
          notes: [
            'Canadian medical licensing is regulated by provincial colleges',
            'Each province maintains its own physician registry',
            'Medical Council of Canada is developing a National Registry',
          ],
        },
        0,
      );
    } catch (error) {
      this.logger.error('Error checking Canadian registry', error);
      throw new HttpException(
        'Canadian Registry Unavailable',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Parse Canadian license number
   * Supports formats: ON-123456, BC-12345, 123456
   */
  private parseLicenseNumber(
    license: string,
  ): { province: string | null; number: string } | null {
    // Format: [PROVINCE]-[NUMBER]
    const prefixMatch = license.match(/^([A-Z]{2})-?(\d{5,6})$/);
    if (prefixMatch) {
      return { province: prefixMatch[1], number: prefixMatch[2] };
    }

    // Format: Just number (province unknown)
    const numberMatch = license.match(/^(\d{5,6})$/);
    if (numberMatch) {
      return { province: null, number: numberMatch[1] };
    }

    return null;
  }
}

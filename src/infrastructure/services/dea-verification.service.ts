import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * DEA Registrant Type
 */
export enum DeaRegistrantType {
  PHYSICIAN = 'A', // Physician, Dentist, Vet, Hospital/Clinic, Practitioner
  MEDICAL_PRACTITIONER = 'B', // Mid-level Practitioner (NP, PA)
  MANUFACTURER = 'C', // Manufacturer
  DISTRIBUTOR = 'D', // Distributor
  RESEARCHER = 'E', // Researcher
  AUTO_DISPENSER = 'F', // Automated Dispensing Facility
  TEACHING_INSTITUTION = 'G', // Teaching Institution
  HOSPITAL_CLINIC = 'H', // Hospital/Clinic
  IMPORT_EXPORT = 'J', // Importer/Exporter
  RETAIL_PHARMACY = 'K', // Retail Pharmacy
  MID_LEVEL = 'M', // Mid-level Practitioner
  NARCOTIC_TREATMENT = 'N', // Narcotic Treatment Program
  LONG_TERM_CARE = 'P', // Long Term Care Pharmacy
  RETAIL = 'R', // Retail Pharmacy (alternate)
  AMBULATORY = 'U', // Department of Defense/VA
  PRACTITIONER = 'X', // Practitioner - DATA Waived
}

/**
 * DEA Verification Result
 */
export interface DeaVerificationResult {
  isValid: boolean;
  deaNumber: string;
  registrantName?: string;
  registrantType?: DeaRegistrantType;
  schedules?: string[]; // I, II, III, IV, V
  expirationDate?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  error?: string;
  verifiedAt: string;
  source: 'DEA_API' | 'FORMAT_VALIDATION' | 'CACHE';
}

/**
 * DEA Verification Service
 *
 * Validates DEA registration numbers for controlled substance prescribers.
 *
 * DEA Number Format:
 * - 9 characters total
 * - Position 1: Registrant type (A, B, C, etc.)
 * - Position 2: First letter of registrant's last name (or 9 for practitioners)
 * - Positions 3-8: Six digits
 * - Position 9: Check digit
 *
 * Checksum Algorithm:
 * 1. Add odd-position digits (3, 5, 7): sum1
 * 2. Add even-position digits (4, 6, 8) and double: sum2 = 2 * (pos4 + pos6 + pos8)
 * 3. Total = sum1 + sum2
 * 4. Check digit = last digit of total
 */
@Injectable()
export class DeaVerificationService {
  private readonly logger = new Logger(DeaVerificationService.name);
  private readonly deaApiKey: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.deaApiKey = this.configService.get<string>('DEA_API_KEY');
  }

  /**
   * Verify a DEA number
   *
   * Performs:
   * 1. Format validation (length, characters)
   * 2. Checksum validation (DEA algorithm)
   * 3. API lookup (if DEA_API_KEY configured)
   */
  async verify(
    deaNumber: string,
    lastName?: string,
  ): Promise<DeaVerificationResult> {
    const normalizedDea = deaNumber.toUpperCase().trim();

    // Step 1: Format validation
    if (!this.isValidFormat(normalizedDea)) {
      return {
        isValid: false,
        deaNumber: normalizedDea,
        error: 'Invalid DEA number format',
        verifiedAt: new Date().toISOString(),
        source: 'FORMAT_VALIDATION',
      };
    }

    // Step 2: Checksum validation
    if (!this.isValidChecksum(normalizedDea)) {
      return {
        isValid: false,
        deaNumber: normalizedDea,
        error: 'Invalid DEA checksum',
        verifiedAt: new Date().toISOString(),
        source: 'FORMAT_VALIDATION',
      };
    }

    // Step 3: Last name initial validation (if provided)
    if (lastName && !this.matchesLastName(normalizedDea, lastName)) {
      return {
        isValid: false,
        deaNumber: normalizedDea,
        error: 'DEA number does not match provider last name',
        verifiedAt: new Date().toISOString(),
        source: 'FORMAT_VALIDATION',
      };
    }

    // Step 4: API lookup (if configured)
    if (this.deaApiKey) {
      return this.verifyWithApi(normalizedDea);
    }

    // Return format-validated result
    this.logger.log(
      `[DEA] Validated format for ${normalizedDea.substring(0, 2)}****`,
    );

    return {
      isValid: true,
      deaNumber: normalizedDea,
      registrantType: normalizedDea.charAt(0) as DeaRegistrantType,
      verifiedAt: new Date().toISOString(),
      source: 'FORMAT_VALIDATION',
    };
  }

  /**
   * Check if DEA number has valid format
   * Format: [A-Z][A-Z9][0-9]{7}
   */
  private isValidFormat(dea: string): boolean {
    if (dea.length !== 9) {
      return false;
    }

    // First character: Valid registrant type
    const validTypes = 'ABCDEFGHJKMNPRUX';
    if (!validTypes.includes(dea.charAt(0))) {
      return false;
    }

    // Second character: Letter or 9
    const second = dea.charAt(1);
    if (!/[A-Z9]/.test(second)) {
      return false;
    }

    // Remaining 7 characters: digits
    const digits = dea.substring(2);
    if (!/^\d{7}$/.test(digits)) {
      return false;
    }

    return true;
  }

  /**
   * Validate DEA checksum
   *
   * Algorithm:
   * 1. Sum of odd-position digits (positions 3, 5, 7 = indices 2, 4, 6)
   * 2. Sum of even-position digits × 2 (positions 4, 6, 8 = indices 3, 5, 7)
   * 3. Total = sum1 + sum2
   * 4. Check digit (position 9 = index 8) should equal last digit of total
   */
  private isValidChecksum(dea: string): boolean {
    const digits = dea.substring(2).split('').map(Number);

    // Odd positions (1st, 3rd, 5th in digits array = indices 0, 2, 4)
    const sum1 = digits[0] + digits[2] + digits[4];

    // Even positions (2nd, 4th, 6th in digits array = indices 1, 3, 5)
    const sum2 = 2 * (digits[1] + digits[3] + digits[5]);

    // Total
    const total = sum1 + sum2;

    // Check digit (7th digit = index 6)
    const checkDigit = digits[6];

    return checkDigit === total % 10;
  }

  /**
   * Check if second character matches last name initial
   */
  private matchesLastName(dea: string, lastName: string): boolean {
    const deaInitial = dea.charAt(1);
    const lastNameInitial = lastName.charAt(0).toUpperCase();

    // '9' is used for some registrant types instead of name initial
    if (deaInitial === '9') {
      return true;
    }

    return deaInitial === lastNameInitial;
  }

  /**
   * Verify against DEA API (requires DEA_API_KEY)
   *
   * Note: Requires approval from DEA Diversion Control Division
   * See: https://apps.deadiversion.usdoj.gov/webforms2/spring/validationLogin
   */
  private async verifyWithApi(dea: string): Promise<DeaVerificationResult> {
    try {
      // DEA NTIS API endpoint (requires registration)
      const response = await axios.get(
        `https://www.ntis.gov/products/dea-lookup?deanumber=${dea}`,
        {
          headers: {
            Authorization: `Bearer ${this.deaApiKey}`,
            Accept: 'application/json',
          },
          timeout: 10000,
        },
      );

      interface DeaApiResponse {
        status: string;
        registrant: {
          name: string;
          address: {
            street: string;
            city: string;
            state: string;
            zip: string;
          };
          schedules: string[];
          expiration_date: string;
        };
      }

      const data = response.data as DeaApiResponse;

      return {
        isValid: data.status === 'ACTIVE',
        deaNumber: dea,
        registrantName: data.registrant?.name,
        registrantType: dea.charAt(0) as DeaRegistrantType,
        schedules: data.registrant?.schedules,
        expirationDate: data.registrant?.expiration_date,
        address: data.registrant?.address,
        verifiedAt: new Date().toISOString(),
        source: 'DEA_API',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`[DEA] API lookup failed: ${errorMessage}`);

      // Fall back to format validation
      return {
        isValid: true, // Format is valid even if API fails
        deaNumber: dea,
        registrantType: dea.charAt(0) as DeaRegistrantType,
        error: `API lookup failed: ${errorMessage}`,
        verifiedAt: new Date().toISOString(),
        source: 'FORMAT_VALIDATION',
      };
    }
  }

  /**
   * Batch verify multiple DEA numbers
   */
  async verifyBatch(
    deaNumbers: string[],
  ): Promise<Map<string, DeaVerificationResult>> {
    const results = new Map<string, DeaVerificationResult>();

    for (const dea of deaNumbers) {
      results.set(dea, await this.verify(dea));
    }

    return results;
  }

  /**
   * Get registrant type description
   */
  getRegistrantTypeDescription(type: DeaRegistrantType): string {
    const descriptions: Record<DeaRegistrantType, string> = {
      [DeaRegistrantType.PHYSICIAN]: 'Physician/Dentist/Veterinarian',
      [DeaRegistrantType.MEDICAL_PRACTITIONER]: 'Medical Practitioner',
      [DeaRegistrantType.MANUFACTURER]: 'Manufacturer',
      [DeaRegistrantType.DISTRIBUTOR]: 'Distributor',
      [DeaRegistrantType.RESEARCHER]: 'Researcher',
      [DeaRegistrantType.AUTO_DISPENSER]: 'Automated Dispensing',
      [DeaRegistrantType.TEACHING_INSTITUTION]: 'Teaching Institution',
      [DeaRegistrantType.HOSPITAL_CLINIC]: 'Hospital/Clinic',
      [DeaRegistrantType.IMPORT_EXPORT]: 'Importer/Exporter',
      [DeaRegistrantType.RETAIL_PHARMACY]: 'Retail Pharmacy',
      [DeaRegistrantType.MID_LEVEL]: 'Mid-level Practitioner',
      [DeaRegistrantType.NARCOTIC_TREATMENT]: 'Narcotic Treatment Program',
      [DeaRegistrantType.LONG_TERM_CARE]: 'Long Term Care Pharmacy',
      [DeaRegistrantType.RETAIL]: 'Retail Pharmacy',
      [DeaRegistrantType.AMBULATORY]: 'DoD/VA Facility',
      [DeaRegistrantType.PRACTITIONER]: 'DATA-Waived Practitioner',
    };

    return descriptions[type] || 'Unknown';
  }
}

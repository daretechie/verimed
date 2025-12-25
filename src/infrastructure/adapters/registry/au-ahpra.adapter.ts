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
 * 🇦🇺 Australia - AHPRA (Australian Health Practitioner Regulation Agency)
 *
 * Registry Type: Centralized national register
 * Website: https://www.ahpra.gov.au
 * Register: https://www.ahpra.gov.au/Registration/Registers-of-Practitioners.aspx
 *
 * API Status: Official API available (PIE - Practitioner Information Exchange)
 * - Access requires AHPRA approval and contract
 * - SOAP/XML web service
 * - Data refreshed every 24 hours
 * - Features: Find, Alert, Identity verification
 *
 * License Format: AHPRA Registration Number
 * - Format: [PREFIX][10 digits]
 * - Medical: MED0001234567 (14 characters)
 * - Nursing: NUR0001234567
 * - Pharmacy: PHA0001234567
 *
 * Profession Prefixes:
 * - MED: Medical Practitioner
 * - DEN: Dentist
 * - NUR: Nurse
 * - MID: Midwife
 * - PHA: Pharmacist
 * - PHY: Physiotherapist
 * - PSY: Psychologist
 * - OPT: Optometrist
 * - CHI: Chiropractor
 * - OST: Osteopath
 * - POD: Podiatrist
 *
 * Note: AHPRA regulates 16 health professions across Australia.
 * The public register is searchable online.
 */
@Injectable()
export class AuAhpraRegistryAdapter implements IRegistryAdapter {
  private readonly logger = new Logger(AuAhpraRegistryAdapter.name);
  private readonly AHPRA_SEARCH_URL =
    'https://www.ahpra.gov.au/Registration/Registers-of-Practitioners.aspx';

  /**
   * Valid profession prefixes for AHPRA registration numbers
   */
  private readonly validPrefixes = [
    'MED', // Medical Practitioner
    'DEN', // Dentist
    'NUR', // Nurse
    'MID', // Midwife
    'PHA', // Pharmacist
    'PHY', // Physiotherapist
    'PSY', // Psychologist
    'OPT', // Optometrist
    'CHI', // Chiropractor
    'OST', // Osteopath
    'POD', // Podiatrist
    'ABO', // Aboriginal and Torres Strait Islander Health Practitioner
    'CME', // Chinese Medicine Practitioner
    'OCC', // Occupational Therapist
    'PAR', // Paramedic
    'MRT', // Medical Radiation Practitioner
  ];

  constructor(private readonly resilience: ResilienceService) {}

  supports(countryCode: string): boolean {
    return countryCode === 'AU';
  }

  async verify(request: VerificationRequest): Promise<VerificationResult> {
    this.logger.log(`Verifying Australian provider: ${request.licenseNumber}`);
    
    // Simulate async work
    await Promise.resolve();

    const licenseNumber = request.licenseNumber
      .toUpperCase()
      .replace(/\s/g, '');

    // Validate AHPRA registration number format
    // Format: [3-letter prefix][10 digits] = 13 characters
    // Sometimes displayed with spaces: MED 000 123 456 7
    const ahpraPattern = /^([A-Z]{3})(\d{10})$/;
    const match = licenseNumber.match(ahpraPattern);

    if (!match) {
      return new VerificationResult(
        VerificationStatus.REJECTED,
        VerificationMethod.API_REGISTRY,
        new Date(),
        {
          reason: 'Invalid Australian AHPRA registration number format',
          expectedFormat: 'MED0001234567 (3-letter prefix + 10 digits)',
          provided: licenseNumber,
          validPrefixes: this.validPrefixes.slice(0, 5).join(', ') + '...',
          note: 'Prefix indicates profession (MED = Medical, NUR = Nursing, etc.)',
        },
        0,
      );
    }

    const [, prefix, number] = match;

    // Validate profession prefix
    if (!this.validPrefixes.includes(prefix)) {
      return new VerificationResult(
        VerificationStatus.REJECTED,
        VerificationMethod.API_REGISTRY,
        new Date(),
        {
          reason: `Invalid AHPRA profession prefix: ${prefix}`,
          validPrefixes: this.validPrefixes.join(', '),
          provided: licenseNumber,
        },
        0,
      );
    }

    // Get profession name
    const professionMap: Record<string, string> = {
      MED: 'Medical Practitioner',
      DEN: 'Dentist',
      NUR: 'Nurse',
      MID: 'Midwife',
      PHA: 'Pharmacist',
      PHY: 'Physiotherapist',
      PSY: 'Psychologist',
      OPT: 'Optometrist',
      CHI: 'Chiropractor',
      OST: 'Osteopath',
      POD: 'Podiatrist',
      ABO: 'Aboriginal/Torres Strait Islander Health Practitioner',
      CME: 'Chinese Medicine Practitioner',
      OCC: 'Occupational Therapist',
      PAR: 'Paramedic',
      MRT: 'Medical Radiation Practitioner',
    };

    const profession = professionMap[prefix] || 'Health Practitioner';

    try {
      // AHPRA has an API (PIE - Practitioner Information Exchange)
      // but it requires a contract. For now, return manual review.

      this.logger.log(
        `[AU] AHPRA ${licenseNumber} (${profession}) - format valid`,
      );

      // In production with PIE API access, we would call:
      // const response = await this.resilience.execute('AU_AHPRA', () =>
      //   this.callPieApi(licenseNumber, request.attributes.dateOfBirth)
      // );

      return new VerificationResult(
        VerificationStatus.MANUAL_REVIEW,
        VerificationMethod.API_REGISTRY,
        new Date(),
        {
          reason: 'AHPRA PIE API access requires contract approval',
          verificationUrl: this.AHPRA_SEARCH_URL,
          ahpraNumber: licenseNumber,
          detectedProfession: profession,
          providerName: `${request.attributes.firstName} ${request.attributes.lastName}`,
          suggestedAction: 'Search AHPRA public register',
          apiStatus: {
            available: true,
            name: 'PIE (Practitioner Information Exchange)',
            accessType: 'Contract required',
            dataRefresh: 'Every 24 hours',
          },
          notes: [
            'AHPRA regulates 16 health professions in Australia',
            'Public register searchable online',
            'PIE API available for approved organizations',
            'Contact AHPRA Employer Services for API access',
          ],
        },
        0,
      );
    } catch (error) {
      this.logger.error('Error checking AHPRA registry', error);
      throw new HttpException(
        'Australia AHPRA Registry Unavailable',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}

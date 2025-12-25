```typescript
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
 * 🇧🇷 Brazil - CFM (Conselho Federal de Medicina)
 *
 * Registry Type: Centralized federal register with regional councils (CRM)
 * API: Public portal search at https://portal.cfm.org.br/
 * Reference: https://www.cfm.org.br
 *
 * License Format: CRM-[STATE]/[NUMBER] (e.g., CRM-SP/123456)
 * States: 27 regional CRMs corresponding to Brazilian states
 */
@Injectable()
export class BrCfmRegistryAdapter implements IRegistryAdapter {
  private readonly logger = new Logger(BrCfmRegistryAdapter.name);
  private readonly CFM_SEARCH_URL = 'https://portal.cfm.org.br/busca-medicos/';

  constructor(private readonly resilience: ResilienceService) {}

  supports(countryCode: string): boolean {
    return countryCode === 'BR';
  }

  async verify(request: VerificationRequest): Promise<VerificationResult> {
    this.logger.log(`Verifying Brazilian provider: ${request.licenseNumber}`);
    
    // Simulate async work
    await Promise.resolve();

    const licenseNumber = request.licenseNumber;

    // Validate Brazilian CRM format (CRM-[STATE]/[NUMBER] or just number+state)
    // Examples: CRM-SP/123456, CRM-RJ/654321, 123456/SP
    const crmPattern = /^(CRM[-\s]?)?([A-Z]{2})[\/\-]?(\d{4,7})$/i;
    const match = licenseNumber.toUpperCase().match(crmPattern);

    if (!match) {
      return new VerificationResult(
        VerificationStatus.REJECTED,
        VerificationMethod.API_REGISTRY,
        new Date(),
        {
          reason: 'Invalid Brazilian CRM license format',
          expectedFormat: 'CRM-SP/123456 or 123456/SP',
          provided: licenseNumber,
          validStates:
            'AC, AL, AP, AM, BA, CE, DF, ES, GO, MA, MT, MS, MG, PA, PB, PR, PE, PI, RJ, RN, RS, RO, RR, SC, SP, SE, TO',
        },
        0,
      );
    }

    const state = match[2];
    const number = match[3];

    // Valid Brazilian states for CRM
    const validStates = [
      'AC',
      'AL',
      'AP',
      'AM',
      'BA',
      'CE',
      'DF',
      'ES',
      'GO',
      'MA',
      'MT',
      'MS',
      'MG',
      'PA',
      'PB',
      'PR',
      'PE',
      'PI',
      'RJ',
      'RN',
      'RS',
      'RO',
      'RR',
      'SC',
      'SP',
      'SE',
      'TO',
    ];

    if (!validStates.includes(state)) {
      return new VerificationResult(
        VerificationStatus.REJECTED,
        VerificationMethod.API_REGISTRY,
        new Date(),
        {
          reason: `Invalid Brazilian state code: ${state}`,
          providedLicense: licenseNumber,
        },
        0,
      );
    }

    try {
      // CFM has a public search portal but no official REST API
      // In production, would need to use web scraping or official partnership

      this.logger.log(`[BR] Verifying CRM-${state}/${number} on CFM portal...`);

      // Return MANUAL_REVIEW since we can't query the portal directly
      return new VerificationResult(
        VerificationStatus.MANUAL_REVIEW,
        VerificationMethod.API_REGISTRY,
        new Date(),
        {
          reason: 'CFM portal verification requires manual check',
          verificationUrl: `${this.CFM_SEARCH_URL}`,
          parsedCRM: `CRM-${state}/${number}`,
          regionalCouncil: `CRM-${state}`,
          suggestedAction: 'Search CFM portal with physician name and state',
        },
        0,
      );
    } catch (error) {
      this.logger.error('Error checking CFM registry', error);
      throw new HttpException(
        'Brazil CFM Registry Unavailable',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}

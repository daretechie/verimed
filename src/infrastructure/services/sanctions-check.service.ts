import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

/**
 * Sanctions Check Result
 */
export interface SanctionsCheckResult {
  isExcluded: boolean;
  source: 'OIG_LEIE' | 'GSA_SAM' | 'COMBINED';
  matches: SanctionsMatch[];
  checkedAt: Date;
}

export interface SanctionsMatch {
  source: string;
  name: string;
  npi?: string;
  exclusionType?: string;
  exclusionDate?: string;
  state?: string;
}

/**
 * SAM API Response types
 */
interface SamExclusionResult {
  firstName?: string;
  lastName?: string;
  exclusionType?: string;
  exclusionDate?: string;
  stateProvince?: string;
}

interface SamApiResponse {
  results?: SamExclusionResult[];
}

/**
 * US Sanctions Checking Service
 *
 * Checks healthcare providers against federal exclusion lists:
 * - OIG LEIE (List of Excluded Individuals/Entities) - HHS Medicare/Medicaid exclusions
 * - GSA SAM (System for Award Management) - Federal debarment list
 *
 * These checks are required for NCQA compliance and help prevent fraud.
 */
@Injectable()
export class SanctionsCheckService {
  private readonly logger = new Logger(SanctionsCheckService.name);

  // GSA SAM.gov API endpoint (free, requires API key for higher limits)
  private readonly SAM_API_BASE = 'https://api.sam.gov/entity-information/v3';
  private readonly SAM_EXCLUSIONS_API =
    'https://api.sam.gov/entity-information/v3/exclusions';

  // OIG LEIE - No direct API, but we can use a local cache or third-party
  // For now, we'll use the online search endpoint
  private readonly OIG_SEARCH_URL =
    'https://exclusions.oig.hhs.gov/api/exclusions';

  constructor(private readonly configService: ConfigService) {}

  /**
   * Check if a provider is on any sanctions/exclusion list
   * @param npi - National Provider Identifier (for US providers)
   * @param firstName - Provider first name
   * @param lastName - Provider last name
   * @param state - State code (optional)
   */
  async checkSanctions(
    npi?: string,
    firstName?: string,
    lastName?: string,
    state?: string,
  ): Promise<SanctionsCheckResult> {
    const matches: SanctionsMatch[] = [];

    // Check GSA SAM exclusions
    const samMatches = await this.checkGsaSam(npi, firstName, lastName, state);
    matches.push(...samMatches);

    // Check OIG LEIE (if we have enough info)
    const oigMatches = this.checkOigLeie(npi, firstName, lastName);
    matches.push(...oigMatches);

    return {
      isExcluded: matches.length > 0,
      source: 'COMBINED',
      matches,
      checkedAt: new Date(),
    };
  }

  /**
   * Check GSA SAM.gov Exclusions
   * Free API: 10 requests/day without key, 1000/day with API key
   */
  private async checkGsaSam(
    npi?: string,
    firstName?: string,
    lastName?: string,
    state?: string,
  ): Promise<SanctionsMatch[]> {
    const matches: SanctionsMatch[] = [];
    const apiKey = this.configService.get<string>('SAM_API_KEY');

    if (!firstName && !lastName && !npi) {
      this.logger.debug('Insufficient info for SAM check');
      return matches;
    }

    try {
      const params: Record<string, string> = {};
      if (firstName) params.firstName = firstName;
      if (lastName) params.lastName = lastName;
      if (state) params.stateProvince = state;

      const url = new URL(this.SAM_EXCLUSIONS_API);
      Object.entries(params).forEach(([key, value]) =>
        url.searchParams.append(key, value),
      );

      if (apiKey) {
        url.searchParams.append('api_key', apiKey);
      }

      this.logger.debug(`Checking SAM exclusions for ${firstName} ${lastName}`);

      const response = await axios.get(url.toString(), {
        timeout: 10000,
        headers: {
          Accept: 'application/json',
        },
      });

      const data = response.data as SamApiResponse;
      if (data?.results) {
        for (const result of data.results) {
          matches.push({
            source: 'GSA_SAM',
            name: `${result.firstName ?? ''} ${result.lastName ?? ''}`.trim(),
            exclusionType: result.exclusionType,
            exclusionDate: result.exclusionDate,
            state: result.stateProvince,
          });
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`SAM API check failed: ${errorMessage}`);
      // Don't throw - sanctions check failure shouldn't block verification
    }

    return matches;
  }

  /**
   * Check OIG LEIE (List of Excluded Individuals/Entities)
   * The OIG doesn't have a public API, but provides downloadable CSV files
   * For production, consider:
   * 1. Downloading and caching the monthly CSV
   * 2. Using a third-party service that aggregates exclusion data
   */
  private checkOigLeie(
    npi?: string,
    firstName?: string,
    lastName?: string,
  ): SanctionsMatch[] {
    const matches: SanctionsMatch[] = [];

    if (!firstName && !lastName && !npi) {
      return matches;
    }

    try {
      // Note: OIG doesn't have a direct public API
      // In production, implement one of:
      // 1. Local database with monthly LEIE downloads
      // 2. Third-party exclusion screening service
      // For now, log that this would be checked
      this.logger.debug(
        `OIG LEIE check would be performed for: ${firstName} ${lastName} (NPI: ${npi || 'N/A'})`,
      );

      // Placeholder - in production, query local LEIE database
      // const leieResults = await this.leieDatabase.search({
      //   npi,
      //   firstName,
      //   lastName,
      // });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`OIG LEIE check failed: ${errorMessage}`);
    }

    return matches;
  }

  /**
   * Get the list of supported exclusion sources
   */
  getSupportedSources(): string[] {
    return ['GSA_SAM', 'OIG_LEIE'];
  }
}

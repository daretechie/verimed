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
 * France - Annuaire Santé (ANS) Registry Adapter
 *
 * LIVE API INTEGRATION
 * Source: Agence du Numérique en Santé
 * API: https://gateway.api.esante.gouv.fr/fhir/v1
 * Documentation: https://esante.gouv.fr/produits-services/annuaire-sante
 *
 * The API uses FHIR R4 standard and provides access to
 * the RPPS (Répertoire Partagé des Professionnels de Santé)
 */
@Injectable()
export class FrAnsRegistryAdapter implements IRegistryAdapter {
  private readonly logger = new Logger(FrAnsRegistryAdapter.name);
  private readonly API_BASE = 'https://gateway.api.esante.gouv.fr/fhir/v1';

  supports(countryCode: string): boolean {
    return countryCode === 'FR';
  }

  async verify(request: VerificationRequest): Promise<VerificationResult> {
    const rppsNumber = request.attributes.licenseNumber;
    this.logger.log(`[FR ANS] Checking Annuaire Santé for RPPS: ${rppsNumber}`);

    // RPPS numbers are 11 digits
    if (!/^\d{11}$/.test(rppsNumber)) {
      return new VerificationResult(
        VerificationStatus.REJECTED,
        VerificationMethod.API_REGISTRY,
        new Date(),
        { reason: 'Invalid RPPS number format. Expected 11 digits.' },
      );
    }

    try {
      // Query the FHIR Practitioner endpoint by identifier
      const response = await axios.get(`${this.API_BASE}/Practitioner`, {
        params: {
          identifier: `urn:oid:1.2.250.1.71.4.2.1|${rppsNumber}`,
          _format: 'json',
        },
        headers: {
          Accept: 'application/fhir+json',
        },
        timeout: 10000,
      });

      const bundle = response.data;

      if (!bundle.entry || bundle.entry.length === 0) {
        return new VerificationResult(
          VerificationStatus.REJECTED,
          VerificationMethod.API_REGISTRY,
          new Date(),
          { reason: 'RPPS number not found in Annuaire Santé', rppsNumber },
        );
      }

      const practitioner = bundle.entry[0].resource;
      const name = practitioner.name?.[0];
      const givenNames = Array.isArray(name?.given) ? name.given.join(' ') : '';
      const fullName = name
        ? `${givenNames} ${name.family || ''}`.trim()
        : 'Unknown';

      // Standardized Fuzzy Matching
      const providerName = fullName;
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
          source: 'ANNUAIRE_SANTE_FHIR',
          rppsNumber,
          providerName: fullName,
          resourceType: practitioner.resourceType,
        },
      );
    } catch (error) {
      this.logger.error('Error connecting to Annuaire Santé API', error);

      const msg = axios.isAxiosError(error)
        ? `Upstream API Error: ${error.message}`
        : 'French Registry Unavailable';

      throw new HttpException(msg, HttpStatus.BAD_GATEWAY);
    }
  }
}

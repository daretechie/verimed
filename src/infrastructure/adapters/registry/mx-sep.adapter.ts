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
 * Mexico - SEP (Secretaría de Educación Pública) Registry Adapter
 *
 * LIVE API INTEGRATION (Via RapidAPI)
 * Source: Registro Nacional de Profesionistas (SEP)
 * API: Cédulas Profesionales SEP (RapidAPI)
 * Documentation: https://rapidapi.com/webscrapp-webscrapp-default/api/cedulas-profesionales-sep/
 */
@Injectable()
export class MxSepRegistryAdapter implements IRegistryAdapter {
  private readonly logger = new Logger(MxSepRegistryAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  supports(countryCode: string): boolean {
    return countryCode === 'MX';
  }

  async verify(request: VerificationRequest): Promise<VerificationResult> {
    const cedulaNumber = request.attributes.licenseNumber;
    this.logger.log(
      `[MX SEP] Checking Cédula Profesional for#: ${cedulaNumber}`,
    );

    const apiKey = this.configService.get<string>('MX_RAPIDAPI_KEY');
    const apiHost =
      this.configService.get<string>('RAPIDAPI_HOST') ||
      'cedulas-profesionales-sep.p.rapidapi.com';

    if (!apiKey) {
      return new VerificationResult(
        VerificationStatus.MANUAL_REVIEW,
        VerificationMethod.API_REGISTRY,
        new Date(),
        {
          reason: 'MX_RAPIDAPI_KEY not configured',
          cedulaNumber,
          note: 'Subscribe at https://rapidapi.com/webscrapp-webscrapp-default/api/cedulas-profesionales-sep/',
        },
      );
    }

    try {
      const response = await axios.get(
        `https://${apiHost}/cedula/${cedulaNumber}`,
        {
          headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': apiHost,
          },
          timeout: 10000,
        },
      );

      const data = response.data;

      // The API usually returns an object with professional details if found
      if (!data || data.error || !data.nombre) {
        return new VerificationResult(
          VerificationStatus.REJECTED,
          VerificationMethod.API_REGISTRY,
          new Date(),
          {
            reason: 'Cédula Profesional not found in Mexico SEP registry',
            cedulaNumber,
          },
        );
      }

      // Standardized Fuzzy Matching
      const providerName =
        `${data.nombre} ${data.paterno} ${data.materno}`.trim();
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
          source: 'MEXICO_SEP_RAPIDAPI',
          cedulaNumber,
          providerName,
          institution: data.institucion || 'N/A',
          degree: data.titulo || 'N/A',
          expeditionYear: data.anio || 'N/A',
        },
      );
    } catch (error) {
      this.logger.error('Error connecting to Mexico SEP API', error);

      const msg = axios.isAxiosError(error)
        ? `Upstream API Error: ${error.message}`
        : 'Mexico Registry Unavailable';

      throw new HttpException(msg, HttpStatus.BAD_GATEWAY);
    }
  }
}

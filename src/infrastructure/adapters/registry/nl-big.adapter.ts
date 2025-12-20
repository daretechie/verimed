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
 * Netherlands - BIG-register Registry Adapter
 *
 * LIVE API INTEGRATION (SOAP)
 * Source: CIBG (Ministerie van Volksgezondheid, Welzijn en Sport)
 * API: https://api.bigregister.nl/zksrv/soap/4
 * Documentation: https://www.bigregister.nl/zoeken/zoeken-met-de-api
 */
@Injectable()
export class NlBigRegistryAdapter implements IRegistryAdapter {
  private readonly logger = new Logger(NlBigRegistryAdapter.name);
  private readonly SOAP_ENDPOINT = 'https://api.bigregister.nl/zksrv/soap/4';

  supports(countryCode: string): boolean {
    return countryCode === 'NL';
  }

  async verify(request: VerificationRequest): Promise<VerificationResult> {
    const bigNumber = request.attributes.licenseNumber;
    this.logger.log(`[NL BIG] Checking BIG-register for BIG#: ${bigNumber}`);

    // BIG numbers are exactly 11 digits
    if (!/^\d{11}$/.test(bigNumber)) {
      return new VerificationResult(
        VerificationStatus.REJECTED,
        VerificationMethod.API_REGISTRY,
        new Date(),
        { reason: 'Invalid BIG number format. Expected 11 digits.' },
      );
    }

    // Construct SOAP request body
    const soapEnvelope = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v4="http://services.cibg.nl/external/v4">
         <soapenv:Header/>
         <soapenv:Body>
            <v4:ListHcpApprox4>
               <v4:RegistrationNumber>${bigNumber}</v4:RegistrationNumber>
            </v4:ListHcpApprox4>
         </soapenv:Body>
      </soapenv:Envelope>
    `.trim();

    try {
      const response = await axios.post(this.SOAP_ENDPOINT, soapEnvelope, {
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          SOAPAction: 'http://services.cibg.nl/external/v4/ListHcpApprox4',
        },
        timeout: 10000,
      });

      const xml = response.data;

      // Basic XML parsing for demo purposes (ideally use a full XML parser like fast-xml-parser)
      // We look for name elements within the response
      const nameMatch = xml.match(/<Names>(.*?)<\/Names>/);
      const professionMatch = xml.match(
        /<ProfessionName>(.*?)<\/ProfessionName>/,
      );

      if (!nameMatch) {
        return new VerificationResult(
          VerificationStatus.REJECTED,
          VerificationMethod.API_REGISTRY,
          new Date(),
          { reason: 'BIG number not found in official registry', bigNumber },
        );
      }

      // Standardized Fuzzy Matching
      const providerName = String(nameMatch[1]);
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
          source: 'BIG_REGISTER_SOAP_API',
          bigNumber,
          providerName,
          profession: professionMatch ? professionMatch[1] : 'Unknown',
        },
      );
    } catch (error) {
      this.logger.error('Error connecting to BIG-register API', error);

      const msg = axios.isAxiosError(error)
        ? `Upstream API Error: ${error.message}`
        : 'Netherlands Registry Unavailable';

      throw new HttpException(msg, HttpStatus.BAD_GATEWAY);
    }
  }
}

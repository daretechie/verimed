/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { IDocumentVerifier } from '../../../domain/ports/document-verifier.port';
import { VerificationRequest } from '../../../domain/entities/verification-request.entity';
import {
  VerificationStatus,
  VerificationMethod,
} from '../../../domain/enums/verification-status.enum';
import { VerificationResult } from '../../../domain/entities/verification-result.entity';

@Injectable()
export class OpenAiDocumentVerifier implements IDocumentVerifier {
  private openai?: OpenAI;
  private readonly logger = new Logger(OpenAiDocumentVerifier.name);

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('AI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async verifyDocuments(
    request: VerificationRequest,
  ): Promise<VerificationResult> {
    if (!this.openai) {
      this.logger.warn('AI_API_KEY not set. Falling back to manual review.');
      return new VerificationResult(
        VerificationStatus.MANUAL_REVIEW,
        VerificationMethod.AI_DOCUMENT,
        new Date(),
        { reason: 'AI not configured' },
        0.0,
      );
    }

    // 1. Extract the first document (assuming single file upload for now)
    const document = request.documents?.[0];
    if (!document) {
      return new VerificationResult(
        VerificationStatus.MANUAL_REVIEW,
        VerificationMethod.AI_DOCUMENT,
        new Date(),
        { reason: 'No documents provided' },
        0.0,
      );
    }

    try {
      // 2. Prepare images for AI
      // The entity now provides 'buffer' and 'mimetype' directly
      const licenseDoc = document.buffer;
      const licenseBase64 = licenseDoc.toString('base64');
      const licenseMime = document.mimetype || 'image/jpeg';

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `You are a Senior Medical Compliance Authenticator. Your task is to verify the authenticity of a medical license and cross-reference it with a National ID/Passport if provided.

STRICT AUTHENTICITY CRITERIA:
1. VISUAL FIDELITY: Check for official seals, holograms, and standardized layouts for ${request.countryCode}. If the document looks like a generic template or has "too perfect" digital text alignment, flag as MANUAL_REVIEW or REJECTED.
2. DATA CONSISTENCY: Compare name and license number to user input.
3. CROSS-VERIFICATION: If an Identity Document (ID) is provided, verify that the Name, DOB, and Photo (if possible) are consistent between the Medical License and the ID. 
4. TAMPER DETECTION: Look for signs of "digital cut-and-paste", mismatched fonts, or blurry metadata around sensitive text.

Response Requirements (JSON only):
{
  "status": "VERIFIED" | "REJECTED" | "MANUAL_REVIEW",
  "confidence": number (0.0 to 1.0),
  "reason": "Detailed explanation of visual findings and data match",
  "data_extracted": { "name": string, "license_number": string, "has_id_match": boolean }
}

### USER ATTRIBUTES TO VERIFY:
${JSON.stringify(request.attributes).replace(/[^a-zA-Z0-9":,.\- ]/g, '')}
### END OF ATTRIBUTES`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Verify these medical credentials.' },
            {
              type: 'image_url',
              image_url: { url: `data:${licenseMime};base64,${licenseBase64}` },
            },
          ],
        },
      ];

      // Add ID Document if available for cross-verification
      if (request.idDocument) {
        const userContent = messages[1].content as Array<any>;
        userContent.push({
          type: 'text',
          text: 'Secondary Identity Document (Passport/ID):',
        });
        userContent.push({
          type: 'image_url',
          image_url: {
            url: `data:${request.idDocument.mimetype || 'image/jpeg'};base64,${request.idDocument.buffer.toString('base64')}`,
          },
        });
      }

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Received empty response from OpenAI');
      }

      const result = JSON.parse(content);

      // Map AI response to our Domain Entity
      return new VerificationResult(
        result.status as VerificationStatus,
        VerificationMethod.AI_DOCUMENT,
        new Date(),
        { aiReason: result.reason, rawAiResponse: result },
        result.confidence,
      );
    } catch (error) {
      this.logger.error('OpenAI Verification Failed', error);
      return new VerificationResult(
        VerificationStatus.MANUAL_REVIEW,
        VerificationMethod.AI_DOCUMENT,
        new Date(),
        { error: error instanceof Error ? error.message : String(error) },
        0.0,
      );
    }
  }
}

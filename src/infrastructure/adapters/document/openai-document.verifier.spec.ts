/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenAiDocumentVerifier } from './openai-document.verifier';
import {
  VerificationStatus,
  VerificationMethod,
} from '../../../domain/enums/verification-status.enum';

// Mock the OpenAI Library
const mockChatCreate = jest.fn();

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockChatCreate,
        },
      },
    })),
  };
});

describe('OpenAiDocumentVerifier', () => {
  let service: OpenAiDocumentVerifier;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAiDocumentVerifier,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === 'AI_API_KEY') return 'test-key';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OpenAiDocumentVerifier>(OpenAiDocumentVerifier);
    mockChatCreate.mockReset();
  });

  it('should parse a successful OpenAI response', async () => {
    // Mock OpenAI returning a valid JSON
    mockChatCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              status: 'VERIFIED',
              confidence: 0.99,
              reason: 'Looks good',
            }),
          },
        },
      ],
    });

    const request: any = {
      providerId: '123',
      documents: [{ buffer: Buffer.from('fake'), mimetype: 'image/png' }],
    };

    const result = await service.verifyDocuments(request);

    expect(result.status).toBe(VerificationStatus.VERIFIED);
    expect(result.metadata.rawAiResponse.confidence).toBe(0.99);
    expect(result.method).toBe(VerificationMethod.AI_DOCUMENT);
    expect(mockChatCreate).toHaveBeenCalled();
  });

  it('should include idDocument in API call when provided', async () => {
    mockChatCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              status: 'VERIFIED',
              confidence: 0.95,
              reason: 'License and ID match perfectly',
              data_extracted: { has_id_match: true },
            }),
          },
        },
      ],
    });

    const request: any = {
      providerId: '123',
      countryCode: 'NG',
      attributes: { firstName: 'John', lastName: 'Doe' },
      documents: [
        { buffer: Buffer.from('license-bytes'), mimetype: 'image/png' },
      ],
      idDocument: {
        buffer: Buffer.from('id-bytes'),
        mimetype: 'image/jpeg',
      },
    };

    const result = await service.verifyDocuments(request);

    expect(result.status).toBe(VerificationStatus.VERIFIED);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const callArgs = mockChatCreate.mock.calls[0][0];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const userMessage = callArgs.messages[1];
    expect(userMessage.content).toHaveLength(4); // Text + Image1 + Text + Image2
    expect(userMessage.content[3].image_url.url).toContain(
      'base64,aWQtYnl0ZXM=',
    );
  });
});

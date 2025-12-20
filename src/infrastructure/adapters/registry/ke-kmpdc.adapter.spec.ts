import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { KeKmpdcRegistryAdapter } from './ke-kmpdc.adapter';
import { VerificationRequest } from '../../../domain/entities/verification-request.entity';
import { VerificationStatus } from '../../../domain/enums/verification-status.enum';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('KeKmpdcRegistryAdapter', () => {
  let adapter: KeKmpdcRegistryAdapter;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeKmpdcRegistryAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'INTELLEX_API_KEY') return 'test-api-key';
              return null;
            }),
          },
        },
      ],
    }).compile();

    adapter = module.get<KeKmpdcRegistryAdapter>(KeKmpdcRegistryAdapter);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('supports', () => {
    it('should return true for KE', () => {
      expect(adapter.supports('KE')).toBe(true);
    });

    it('should return false for other countries', () => {
      expect(adapter.supports('US')).toBe(false);
    });
  });

  describe('verify', () => {
    const mockRequest: VerificationRequest = {
      providerId: 'provider-1',
      countryCode: 'KE',
      attributes: {
        licenseNumber: 'A1234',
        firstName: 'Jomo',
        lastName: 'Kenyatta',
      },
      documents: [],
    };

    it('should return MANUAL_REVIEW if API key is missing', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(null);
      const result = await adapter.verify(mockRequest);
      expect(result.status).toBe(VerificationStatus.MANUAL_REVIEW);
      expect(result.metadata.reason).toContain('KEY not configured');
    });

    it('should return REJECTED if practitioner not found', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {},
      });

      const result = await adapter.verify(mockRequest);
      expect(result.status).toBe(VerificationStatus.REJECTED);
      expect(result.metadata.reason).toContain('not found');
    });

    it('should return VERIFIED if found and name matches', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          practitioner: {
            name: 'Jomo Kenyatta',
            qualifications: ['MD'],
            specialty: 'Surgery',
            status: 'Active',
          },
        },
      });

      const result = await adapter.verify(mockRequest);
      expect(result.status).toBe(VerificationStatus.VERIFIED);
      expect(result.metadata.registrationNumber).toBe('A1234');
    });

    it('should return MANUAL_REVIEW if name does not match', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          practitioner: {
            name: 'Different Person',
          },
        },
      });

      const result = await adapter.verify(mockRequest);
      expect(result.status).toBe(VerificationStatus.MANUAL_REVIEW);
      expect(result.metadata.reason).toContain('Name mismatch');
    });

    it('should return MANUAL_REVIEW on 401 Unauthorized', async () => {
      const error: any = new Error('Unauthorized');
      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      error.isAxiosError = true;
      error.response = { status: 401 };
      /* eslint-enable @typescript-eslint/no-unsafe-member-access */
      mockedAxios.get.mockRejectedValueOnce(error);
      mockedAxios.isAxiosError.mockReturnValue(true);

      const result = await adapter.verify(mockRequest);
      expect(result.status).toBe(VerificationStatus.MANUAL_REVIEW);
      expect(result.metadata.reason).toContain('Invalid INTELLEX_API_KEY');
    });

    it('should throw HttpException on other API errors', async () => {
      const error: any = new Error('Network Error');
      mockedAxios.get.mockRejectedValueOnce(error);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(adapter.verify(mockRequest)).rejects.toThrow();
    });
  });
});

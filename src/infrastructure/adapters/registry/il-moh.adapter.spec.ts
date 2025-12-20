import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { IlMohRegistryAdapter } from './il-moh.adapter';
import { VerificationRequest } from '../../../domain/entities/verification-request.entity';
import { VerificationStatus } from '../../../domain/enums/verification-status.enum';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('IlMohRegistryAdapter', () => {
  let adapter: IlMohRegistryAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IlMohRegistryAdapter],
    }).compile();

    adapter = module.get<IlMohRegistryAdapter>(IlMohRegistryAdapter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('supports', () => {
    it('should return true for IL', () => {
      expect(adapter.supports('IL')).toBe(true);
    });

    it('should return false for other countries', () => {
      expect(adapter.supports('US')).toBe(false);
    });
  });

  describe('verify', () => {
    const mockRequest: VerificationRequest = {
      providerId: 'provider-1',
      countryCode: 'IL',
      attributes: {
        licenseNumber: '123456',
        firstName: 'Israel',
        lastName: 'Israeli',
      },
      documents: [],
    };

    it('should return REJECTED if license format is invalid', async () => {
      const result = await adapter.verify({
        ...mockRequest,
        attributes: { ...mockRequest.attributes, licenseNumber: '1' },
      });
      expect(result.status).toBe(VerificationStatus.REJECTED);
      expect(result.metadata.reason).toContain(
        'Invalid Israel medical license format',
      );
    });

    it('should return REJECTED if license not found in registry', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { result: { records: [] } },
      });

      const result = await adapter.verify(mockRequest);
      expect(result.status).toBe(VerificationStatus.REJECTED);
      expect(result.metadata.reason).toContain('not found');
    });

    it('should return REJECTED if exact match not found', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          result: {
            records: [{ "מס' רישיון": '999999' }],
          },
        },
      });

      const result = await adapter.verify(mockRequest);
      expect(result.status).toBe(VerificationStatus.REJECTED);
      expect(result.metadata.reason).toContain('No exact license number match');
    });

    it('should return VERIFIED if found and name matches', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          result: {
            records: [
              {
                "מס' רישיון": '123456',
                'שם פרטי': 'Israel',
                'שם משפחה': 'Israeli',
                'תואר מומחיות': 'Cardiology',
              },
            ],
          },
        },
      });

      const result = await adapter.verify(mockRequest);
      expect(result.status).toBe(VerificationStatus.VERIFIED);
      expect(result.metadata.licenseNumber).toBe('123456');
    });

    it('should return MANUAL_REVIEW if name does not match', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          result: {
            records: [
              {
                "מס' רישיון": '123456',
                'שם פרטי': 'Other',
                'שם משפחה': 'Person',
              },
            ],
          },
        },
      });

      const result = await adapter.verify(mockRequest);
      expect(result.status).toBe(VerificationStatus.MANUAL_REVIEW);
      expect(result.metadata.reason).toContain('Name mismatch');
    });

    it('should throw HttpException on API error', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

      await expect(adapter.verify(mockRequest)).rejects.toThrow();
    });
  });
});

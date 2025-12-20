import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { AeDhaRegistryAdapter } from './ae-dha.adapter';
import { VerificationRequest } from '../../../domain/entities/verification-request.entity';
import { VerificationStatus } from '../../../domain/enums/verification-status.enum';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AeDhaRegistryAdapter', () => {
  let adapter: AeDhaRegistryAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AeDhaRegistryAdapter],
    }).compile();

    adapter = module.get<AeDhaRegistryAdapter>(AeDhaRegistryAdapter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('supports', () => {
    it('should return true for AE', () => {
      expect(adapter.supports('AE')).toBe(true);
    });

    it('should return false for other countries', () => {
      expect(adapter.supports('US')).toBe(false);
    });
  });

  describe('verify', () => {
    const mockRequest: VerificationRequest = {
      providerId: 'provider-1',
      countryCode: 'AE',
      attributes: {
        licenseNumber: 'DHA-123456',
        firstName: 'Ahmed',
        lastName: 'Ali',
      },
      documents: [],
    };

    it('should return REJECTED if license format is invalid', async () => {
      const result = await adapter.verify({
        ...mockRequest,
        attributes: { ...mockRequest.attributes, licenseNumber: 'INVALID' },
      });
      expect(result.status).toBe(VerificationStatus.REJECTED);
      expect(result.metadata.reason).toContain('Invalid DHA license format');
    });

    it('should return REJECTED if license not found in registry', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { records: [] },
      });

      const result = await adapter.verify(mockRequest);
      expect(result.status).toBe(VerificationStatus.REJECTED);
      expect(result.metadata.reason).toContain('not found');
    });

    it('should return VERIFIED if license found and name matches', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          records: [
            {
              fields: {
                professional_name: 'Ahmed Ali',
                specialty: 'General Medicine',
                facility_name: 'Dubai Hospital',
                status: 'Active',
              },
            },
          ],
        },
      });

      const result = await adapter.verify(mockRequest);
      expect(result.status).toBe(VerificationStatus.VERIFIED);
      expect(result.metadata.dhaLicense).toBe('DHA-123456');
    });

    it('should return MANUAL_REVIEW if name does not match', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          records: [
            {
              fields: {
                professional_name: 'John Doe',
              },
            },
          ],
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
      expect(result.metadata.reason).toContain('requires authentication');
    });

    it('should throw HttpException on other API errors', async () => {
      const error: any = new Error('Network Error');
      mockedAxios.get.mockRejectedValueOnce(error);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(adapter.verify(mockRequest)).rejects.toThrow();
    });
  });
});

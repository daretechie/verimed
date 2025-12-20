import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { FrAnsRegistryAdapter } from './fr-ans.adapter';
import { VerificationRequest } from '../../../domain/entities/verification-request.entity';
import { VerificationStatus } from '../../../domain/enums/verification-status.enum';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FrAnsRegistryAdapter', () => {
  let adapter: FrAnsRegistryAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FrAnsRegistryAdapter],
    }).compile();

    adapter = module.get<FrAnsRegistryAdapter>(FrAnsRegistryAdapter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('supports', () => {
    it('should return true for FR', () => {
      expect(adapter.supports('FR')).toBe(true);
    });

    it('should return false for other countries', () => {
      expect(adapter.supports('US')).toBe(false);
    });
  });

  describe('verify', () => {
    const mockRequest: VerificationRequest = {
      providerId: 'provider-1',
      countryCode: 'FR',
      attributes: {
        licenseNumber: '10001234567', // 11 digits
        firstName: 'Jean',
        lastName: 'Dupont',
      },
      documents: [],
    };

    it('should return REJECTED if RPPS format is invalid', async () => {
      const result = await adapter.verify({
        ...mockRequest,
        attributes: { ...mockRequest.attributes, licenseNumber: '123' },
      });
      expect(result.status).toBe(VerificationStatus.REJECTED);
      expect(result.metadata.reason).toContain('Invalid RPPS number format');
    });

    it('should return REJECTED if RPPS not found in registry', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { entry: [] },
      });

      const result = await adapter.verify(mockRequest);
      expect(result.status).toBe(VerificationStatus.REJECTED);
      expect(result.metadata.reason).toContain('not found');
    });

    it('should return VERIFIED if RPPS found and name matches', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          entry: [
            {
              resource: {
                resourceType: 'Practitioner',
                name: [
                  {
                    given: ['Jean'],
                    family: 'Dupont',
                  },
                ],
              },
            },
          ],
        },
      });

      const result = await adapter.verify(mockRequest);
      expect(result.status).toBe(VerificationStatus.VERIFIED);
      expect(result.metadata.rppsNumber).toBe('10001234567');
    });

    it('should return MANUAL_REVIEW if name does not match', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          entry: [
            {
              resource: {
                resourceType: 'Practitioner',
                name: [
                  {
                    given: ['Pierre'],
                    family: 'Martin',
                  },
                ],
              },
            },
          ],
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

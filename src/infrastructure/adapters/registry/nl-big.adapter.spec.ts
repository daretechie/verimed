import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { NlBigRegistryAdapter } from './nl-big.adapter';
import { VerificationRequest } from '../../../domain/entities/verification-request.entity';
import { VerificationStatus } from '../../../domain/enums/verification-status.enum';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('NlBigRegistryAdapter', () => {
  let adapter: NlBigRegistryAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NlBigRegistryAdapter],
    }).compile();

    adapter = module.get<NlBigRegistryAdapter>(NlBigRegistryAdapter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('supports', () => {
    it('should return true for NL', () => {
      expect(adapter.supports('NL')).toBe(true);
    });

    it('should return false for other countries', () => {
      expect(adapter.supports('US')).toBe(false);
    });
  });

  describe('verify', () => {
    const mockRequest: VerificationRequest = {
      providerId: 'provider-1',
      countryCode: 'NL',
      attributes: {
        licenseNumber: '12345678901', // 11 digits
        firstName: 'Jan',
        lastName: 'Jansen',
      },
      documents: [],
    };

    it('should return REJECTED if BIG number format is invalid', async () => {
      const result = await adapter.verify({
        ...mockRequest,
        attributes: { ...mockRequest.attributes, licenseNumber: '123' },
      });
      expect(result.status).toBe(VerificationStatus.REJECTED);
      expect(result.metadata.reason).toContain('Invalid BIG number format');
    });

    it('should return REJECTED if BIG number not found in registry', async () => {
      // Mock XML response with no matches
      mockedAxios.post.mockResolvedValueOnce({
        data: '<ListHcpApproxResponse></ListHcpApproxResponse>',
      });

      const result = await adapter.verify(mockRequest);
      expect(result.status).toBe(VerificationStatus.REJECTED);
      expect(result.metadata.reason).toContain('not found');
    });

    it('should return VERIFIED if BIG number found and name matches', async () => {
      // Mock XML response with a match
      mockedAxios.post.mockResolvedValueOnce({
        data: `
          <ListHcpApproxResponse>
            <ListHcpApprox>
                <Names>Jan Jansen</Names>
                <ProfessionName>Arts</ProfessionName>
            </ListHcpApprox>
          </ListHcpApproxResponse>
        `,
      });

      const result = await adapter.verify(mockRequest);
      expect(result.status).toBe(VerificationStatus.VERIFIED);
      expect(result.metadata.bigNumber).toBe('12345678901');
    });

    it('should return MANUAL_REVIEW if name does not match', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: `
          <ListHcpApproxResponse>
            <ListHcpApprox>
                <Names>Piet de Vries</Names>
                <ProfessionName>Arts</ProfessionName>
            </ListHcpApprox>
          </ListHcpApproxResponse>
        `,
      });

      const result = await adapter.verify(mockRequest);
      expect(result.status).toBe(VerificationStatus.MANUAL_REVIEW);
      expect(result.metadata.reason).toContain('Name mismatch');
    });

    it('should throw HttpException on API error', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network Error'));

      await expect(adapter.verify(mockRequest)).rejects.toThrow();
    });
  });
});

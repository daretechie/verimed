import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { MxSepRegistryAdapter } from './mx-sep.adapter';
import { VerificationRequest } from '../../../domain/entities/verification-request.entity';
import { VerificationStatus } from '../../../domain/enums/verification-status.enum';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MxSepRegistryAdapter', () => {
  let adapter: MxSepRegistryAdapter;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MxSepRegistryAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'MX_RAPIDAPI_KEY') return 'test-api-key';
              if (key === 'RAPIDAPI_HOST') return 'test-host';
              return null;
            }),
          },
        },
      ],
    }).compile();

    adapter = module.get<MxSepRegistryAdapter>(MxSepRegistryAdapter);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('supports', () => {
    it('should return true for MX', () => {
      expect(adapter.supports('MX')).toBe(true);
    });

    it('should return false for other countries', () => {
      expect(adapter.supports('US')).toBe(false);
    });
  });

  describe('verify', () => {
    const mockRequest: VerificationRequest = {
      providerId: 'provider-1',
      countryCode: 'MX',
      attributes: {
        licenseNumber: '12345678',
        firstName: 'Juan',
        lastName: 'Perez',
      },
      documents: [],
    };

    it('should return MANUAL_REVIEW if API key is missing', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(null);
      const result = await adapter.verify(mockRequest);
      expect(result.status).toBe(VerificationStatus.MANUAL_REVIEW);
      expect(result.metadata.reason).toContain('KEY not configured');
    });

    it('should return REJECTED if cedula not found', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { error: 'Not Found' },
      });

      const result = await adapter.verify(mockRequest);
      expect(result.status).toBe(VerificationStatus.REJECTED);
      expect(result.metadata.reason).toContain('not found');
    });

    it('should return REJECTED if data incomplete', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { nombre: null },
      });

      const result = await adapter.verify(mockRequest);
      expect(result.status).toBe(VerificationStatus.REJECTED);
    });

    it('should return VERIFIED if found and name matches', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          nombre: 'Juan',
          paterno: 'Perez',
          materno: 'Lopez',
          institucion: 'UNAM',
          titulo: 'Medico Cirujano',
          anio: '2020',
        },
      });

      // Juan Perez Lopez contains "Juan Perez"
      const result = await adapter.verify(mockRequest);
      expect(result.status).toBe(VerificationStatus.VERIFIED);
      expect(result.metadata.cedulaNumber).toBe('12345678');
    });

    it('should return MANUAL_REVIEW if name does not match', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          nombre: 'Pedro',
          paterno: 'Ramirez',
          materno: 'Soto',
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

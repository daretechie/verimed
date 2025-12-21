import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SanctionsCheckService } from './sanctions-check.service';
import { LeieService } from './leie.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SanctionsCheckService', () => {
  let service: SanctionsCheckService;
  let mockLeieService: Partial<LeieService>;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockLeieService = {
      search: jest.fn().mockReturnValue({
        isExcluded: false,
        matches: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SanctionsCheckService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: LeieService,
          useValue: mockLeieService,
        },
      ],
    }).compile();

    service = module.get<SanctionsCheckService>(SanctionsCheckService);
  });

  describe('checkSanctions', () => {
    it('should return no exclusions when provider is clear', async () => {
      mockedAxios.get.mockResolvedValue({ data: { results: [] } });
      mockLeieService.search = jest.fn().mockReturnValue({
        isExcluded: false,
        matches: [],
      });

      const result = await service.checkSanctions(
        '1234567890',
        'John',
        'Smith',
      );

      expect(result.isExcluded).toBe(false);
      expect(result.matches).toHaveLength(0);
      expect(result.source).toBe('COMBINED');
    });

    it('should return exclusion when SAM finds match', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          results: [
            {
              firstName: 'John',
              lastName: 'Smith',
              exclusionType: 'DEBARMENT',
              exclusionDate: '2024-01-15',
              stateProvince: 'TX',
            },
          ],
        },
      });

      const result = await service.checkSanctions(
        '1234567890',
        'John',
        'Smith',
        'TX',
      );

      expect(result.isExcluded).toBe(true);
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches[0].source).toBe('GSA_SAM');
    });

    it('should return exclusion when LEIE finds match', async () => {
      mockedAxios.get.mockResolvedValue({ data: { results: [] } });
      mockLeieService.search = jest.fn().mockReturnValue({
        isExcluded: true,
        matches: [
          {
            firstName: 'John',
            lastName: 'Smith',
            npi: '1234567890',
            exclType: 'MANDATORY',
            exclDate: '2024-01-15',
            state: 'TX',
          },
        ],
      });

      const result = await service.checkSanctions(
        '1234567890',
        'John',
        'Smith',
      );

      expect(result.isExcluded).toBe(true);
      expect(result.matches.some((m) => m.source === 'OIG_LEIE')).toBe(true);
    });

    it('should handle SAM API error gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await service.checkSanctions(
        '1234567890',
        'John',
        'Smith',
      );

      // Should not throw, but return empty results
      expect(result).toHaveProperty('isExcluded');
      expect(result).toHaveProperty('checkedAt');
    });

    it('should skip SAM check when no name or NPI provided', async () => {
      const result = await service.checkSanctions();

      expect(mockedAxios.get).not.toHaveBeenCalled();
      expect(result.isExcluded).toBe(false);
    });
  });

  describe('getSupportedSources', () => {
    it('should return list of supported sources', () => {
      const sources = service.getSupportedSources();

      expect(sources).toContain('GSA_SAM');
      expect(sources).toContain('OIG_LEIE');
      expect(sources).toHaveLength(2);
    });
  });

  describe('without LeieService', () => {
    it('should handle missing LeieService gracefully', async () => {
      // Create service without LeieService
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SanctionsCheckService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const serviceWithoutLeie =
        module.get<SanctionsCheckService>(SanctionsCheckService);
      mockedAxios.get.mockResolvedValue({ data: { results: [] } });

      const result = await serviceWithoutLeie.checkSanctions(
        '1234567890',
        'John',
        'Smith',
      );

      expect(result.isExcluded).toBe(false);
    });
  });
});

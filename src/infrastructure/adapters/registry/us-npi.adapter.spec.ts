import { Test, TestingModule } from '@nestjs/testing';
import { UsNpiRegistryAdapter } from './us-npi.adapter';
import { VerificationRequest } from '../../../domain/entities/verification-request.entity';
import { VerificationStatus } from '../../../domain/enums/verification-status.enum';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('UsNpiRegistryAdapter', () => {
  let adapter: UsNpiRegistryAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsNpiRegistryAdapter],
    }).compile();

    adapter = module.get<UsNpiRegistryAdapter>(UsNpiRegistryAdapter);
  });

  it('should verify provider when names match exactly', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        result_count: 1,
        results: [
          {
            number: '1234567893',
            basic: {
              first_name: 'GREGORY',
              last_name: 'HOUSE',
              last_updated: '2023-01-01',
            },
          },
        ],
      },
    });

    const request = new VerificationRequest('prov-1', 'US', {
      firstName: 'GREGORY',
      lastName: 'HOUSE',
      licenseNumber: '1234567893',
    });

    const result = await adapter.verify(request);
    expect(result.status).toBe(VerificationStatus.VERIFIED);
    expect(result.metadata.matchScore).toBe(1);
  });

  it('should verify provider when names match with minor variations (Fuzzy Matching)', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        result_count: 1,
        results: [
          {
            number: '1234567893',
            basic: {
              first_name: 'GREGORY',
              last_name: 'HOUSE',
              last_updated: '2023-01-01',
            },
          },
        ],
      },
    });

    const request = new VerificationRequest('prov-1', 'US', {
      firstName: 'Gregary', // Variation (Typo)
      lastName: 'House',
      licenseNumber: '1234567893',
    });

    const result = await adapter.verify(request);
    expect(result.status).toBe(VerificationStatus.VERIFIED);
    expect(result.metadata.matchScore).toBeGreaterThan(0.7);
  });

  it('should flag for manual review when names mismatch significantly', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        result_count: 1,
        results: [
          {
            number: '1234567893',
            basic: {
              first_name: 'GREGORY',
              last_name: 'HOUSE',
              last_updated: '2023-01-01',
            },
          },
        ],
      },
    });

    const request = new VerificationRequest('prov-1', 'US', {
      firstName: 'John',
      lastName: 'Doe',
      licenseNumber: '1234567893',
    });

    const result = await adapter.verify(request);
    expect(result.status).toBe(VerificationStatus.MANUAL_REVIEW);
    expect(result.metadata.reason).toBe('Name mismatch with registry');
  });
});

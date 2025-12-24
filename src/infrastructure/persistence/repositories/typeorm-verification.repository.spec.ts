/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeOrmVerificationRepository } from './typeorm-verification.repository';
import { VerificationLogEntity } from '../entities/verification-log.entity';
import { VerificationRequest } from '../../../domain/entities/verification-request.entity';
import { VerificationResult } from '../../../domain/entities/verification-result.entity';
import {
  VerificationStatus,
  VerificationMethod,
} from '../../../domain/enums/verification-status.enum';

describe('TypeOrmVerificationRepository', () => {
  let repository: TypeOrmVerificationRepository;
  let repo: Repository<VerificationLogEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TypeOrmVerificationRepository,
        {
          provide: getRepositoryToken(VerificationLogEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOneBy: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<TypeOrmVerificationRepository>(
      TypeOrmVerificationRepository,
    );
    repo = module.get<Repository<VerificationLogEntity>>(
      getRepositoryToken(VerificationLogEntity),
    );
  });

  it('should save a verification result', async () => {
    const request = new VerificationRequest(
      'prov-1',
      'US',
      { firstName: 'test', lastName: 'user', licenseNumber: '123' },
      [],
    );
    const result = new VerificationResult(
      VerificationStatus.VERIFIED,
      VerificationMethod.API_REGISTRY,
      new Date(),
      {},
      1.0,
    );

    const mockLog = { id: 'uuid-1' };
    (repo.create as jest.Mock).mockReturnValue(mockLog);
    (repo.save as jest.Mock).mockResolvedValue(mockLog);

    const id = await repository.save(request, result);

    expect(id).toBe('uuid-1');
    expect(repo.create).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith(mockLog);
  });

  it('should find a verification by ID', async () => {
    const mockLog = {
      id: 'uuid-1',
      status: VerificationStatus.VERIFIED,
      method: VerificationMethod.API_REGISTRY,
      timestamp: new Date(),
      metadata: {},
      confidenceScore: 1.0,
    };
    (repo.findOneBy as jest.Mock).mockResolvedValue(mockLog);

    const result = await repository.findById('uuid-1');

    expect(result).toBeDefined();
    expect(result?.status).toBe(VerificationStatus.VERIFIED);
    expect(repo.findOneBy).toHaveBeenCalledWith({ id: 'uuid-1' });
  });

  it('should return null if verification not found', async () => {
    (repo.findOneBy as jest.Mock).mockResolvedValue(null);
    const result = await repository.findById('non-existent');
    expect(result).toBeNull();
  });

  it('should update status and metadata', async () => {
    const mockLog = {
      id: 'uuid-1',
      status: VerificationStatus.PENDING,
      metadata: {},
    };
    (repo.findOneBy as jest.Mock).mockResolvedValue(mockLog);

    await repository.updateStatus('uuid-1', VerificationStatus.VERIFIED, {
      reason: 'manual',
    });

    expect(mockLog.status).toBe(VerificationStatus.VERIFIED);
    expect(mockLog.metadata).toEqual({ reason: 'manual' });
    expect(repo.save).toHaveBeenCalled();
  });

  it('should find verified providers', async () => {
    const mockLogs = [
      {
        providerId: 'p1',
        countryCode: 'US',
        attributes: { firstName: 'J', lastName: 'D', licenseNumber: 'L1' },
      },
    ];
    (repo.find as jest.Mock).mockResolvedValue(mockLogs);

    const results = await repository.findVerifiedProviders();

    expect(results).toHaveLength(1);
    expect(results[0].providerId).toBe('p1');
  });

  it('should check if provider needs re-verification', async () => {
    const mockLog = {
      status: VerificationStatus.VERIFIED,
      getDaysUntilExpiration: jest.fn().mockReturnValue(30),
    };
    (repo.findOne as jest.Mock).mockResolvedValue(mockLog);

    const result = await repository.needsReverification('p1', 14);

    expect(result.needsReverification).toBe(false);
    expect(result.daysRemaining).toBe(30);
  });

  it('should return needsReverification true if no latest record exists', async () => {
    (repo.findOne as jest.Mock).mockResolvedValue(null);
    const result = await repository.needsReverification('p1');
    expect(result.needsReverification).toBe(true);
    expect(result.daysRemaining).toBeNull();
  });
});

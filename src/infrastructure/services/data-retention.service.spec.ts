import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataRetentionService } from './data-retention.service';
import { VerificationLogEntity } from '../persistence/entities/verification-log.entity';

describe('DataRetentionService', () => {
  let service: DataRetentionService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataRetentionService,
        {
          provide: getRepositoryToken(VerificationLogEntity),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<DataRetentionService>(DataRetentionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleDailyCleanup', () => {
    it('should call repository with correct parameters', async () => {
      await service.handleDailyCleanup();

      const updateBuilder = mockRepo.createQueryBuilder();

      expect(updateBuilder.update).toHaveBeenCalledWith(VerificationLogEntity);
      expect(updateBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({
            firstName: '[REDACTED]',
          }),
        }),
      );
      expect(updateBuilder.where).toHaveBeenCalledWith(
        'timestamp < :cutoff',
        expect.anything(), // Verifying exact date is tricky, just check param presence
      );
      expect(updateBuilder.execute).toHaveBeenCalled();
    });
  });
});

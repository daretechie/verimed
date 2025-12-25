import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ManualReviewService } from './manual-review.service';
import { VerificationLogEntity } from '../persistence/entities/verification-log.entity';

describe('ManualReviewService', () => {
  let service: ManualReviewService;
  let mockRepo: any;

  const mockLog: Partial<VerificationLogEntity> = {
    id: 'test-id-123',
    providerId: 'provider-1',
    status: 'MANUAL_REVIEW',
    timestamp: new Date(),
    metadata: {},
  };

  beforeEach(async () => {
    mockRepo = {
      find: jest.fn(),
      count: jest.fn(),
      findOneOrFail: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManualReviewService,
        {
          provide: getRepositoryToken(VerificationLogEntity),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<ManualReviewService>(ManualReviewService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPendingReviews', () => {
    it('should return pending reviews ordered by timestamp', async () => {
      mockRepo.find.mockResolvedValue([mockLog]);

      const result = await service.getPendingReviews();

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { status: 'MANUAL_REVIEW' },
        order: { timestamp: 'ASC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('getPendingCount', () => {
    it('should return count of pending reviews', async () => {
      mockRepo.count.mockResolvedValue(5);

      const result = await service.getPendingCount();

      expect(result).toBe(5);
    });
  });

  describe('approveReview', () => {
    it('should update status to VERIFIED and add metadata', async () => {
      mockRepo.findOneOrFail.mockResolvedValue({ ...mockLog });
      mockRepo.save.mockImplementation((log) => Promise.resolve(log));

      const result = await service.approveReview(
        'test-id-123',
        'reviewer-1',
        'Looks good',
      );

      expect(result.status).toBe('VERIFIED');
      expect(result.metadata.humanReview.action).toBe('APPROVED');
      expect(result.metadata.humanReview.reviewerId).toBe('reviewer-1');
    });
  });

  describe('rejectReview', () => {
    it('should update status to REJECTED with reason', async () => {
      mockRepo.findOneOrFail.mockResolvedValue({ ...mockLog });
      mockRepo.save.mockImplementation((log) => Promise.resolve(log));

      const result = await service.rejectReview(
        'test-id-123',
        'reviewer-1',
        'Invalid document',
      );

      expect(result.status).toBe('REJECTED');
      expect(result.metadata.humanReview.action).toBe('REJECTED');
      expect(result.metadata.humanReview.reason).toBe('Invalid document');
    });
  });

  describe('escalateReview', () => {
    it('should add escalation metadata', async () => {
      mockRepo.findOneOrFail.mockResolvedValue({ ...mockLog });
      mockRepo.save.mockImplementation((log) => Promise.resolve(log));

      const result = await service.escalateReview(
        'test-id-123',
        'reviewer-1',
        'Needs senior review',
      );

      expect(result.metadata.escalation.escalatedBy).toBe('reviewer-1');
      expect(result.metadata.escalation.reason).toBe('Needs senior review');
    });
  });
});

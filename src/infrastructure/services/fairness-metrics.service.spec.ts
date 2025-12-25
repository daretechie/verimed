import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FairnessMetricsService } from './fairness-metrics.service';
import { VerificationLogEntity } from '../persistence/entities/verification-log.entity';

describe('FairnessMetricsService', () => {
  let service: FairnessMetricsService;
  let mockRepo: any;

  const mockLogs: Partial<VerificationLogEntity>[] = [
    { status: 'VERIFIED', confidenceScore: 0.95, timestamp: new Date() },
    { status: 'VERIFIED', confidenceScore: 0.88, timestamp: new Date() },
    { status: 'MANUAL_REVIEW', confidenceScore: 0.55, timestamp: new Date() },
    { status: 'REJECTED', confidenceScore: 0.3, timestamp: new Date() },
    { status: 'PENDING', confidenceScore: 0.0, timestamp: new Date() },
  ];

  beforeEach(async () => {
    mockRepo = {
      find: jest.fn().mockResolvedValue(mockLogs),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FairnessMetricsService,
        {
          provide: getRepositoryToken(VerificationLogEntity),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<FairnessMetricsService>(FairnessMetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOutcomeDistribution', () => {
    it('should calculate outcome metrics correctly', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date();

      const result = await service.getOutcomeDistribution(startDate, endDate);

      expect(result.total).toBe(5);
      expect(result.verified).toBe(2);
      expect(result.rejected).toBe(1);
      expect(result.manualReview).toBe(1);
      expect(result.pending).toBe(1);
      expect(result.verificationRate).toBe(0.4); // 2/5
    });
  });

  describe('getConfidenceDistribution', () => {
    it('should calculate confidence metrics correctly', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date();

      const result = await service.getConfidenceDistribution(
        startDate,
        endDate,
      );

      expect(result.minScore).toBe(0);
      expect(result.maxScore).toBe(0.95);
      expect(result.lowConfidenceCount).toBe(3); // Scores < 0.6
      expect(result.highConfidenceCount).toBe(2); // Scores >= 0.85
    });
  });

  describe('generateFairnessReport', () => {
    it('should generate comprehensive report with alerts', async () => {
      const result = await service.generateFairnessReport(30);

      expect(result.period.start).toBeDefined();
      expect(result.period.end).toBeDefined();
      expect(result.outcomes).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.alerts).toBeInstanceOf(Array);
    });
  });
});

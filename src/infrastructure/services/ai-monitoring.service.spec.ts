import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  AIMonitoringService,
  BudgetExceededError,
} from './ai-monitoring.service';

describe('AIMonitoringService', () => {
  let service: AIMonitoringService;
  let mockConfigService: { get: jest.Mock };

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn(),
    };

    // Default: Budget $5, Kill Switch False
    mockConfigService.get.mockImplementation(
      (key: string, defaultValue?: string) => {
        if (key === 'AI_DAILY_BUDGET') return '5.00';
        if (key === 'AI_KILL_SWITCH') return 'false';
        return defaultValue;
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIMonitoringService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AIMonitoringService>(AIMonitoringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkBudget', () => {
    it('should allow requests within budget', () => {
      // Current cost 0, estimated 0.01 -> Total 0.01 < 5.00
      expect(() => service.checkBudget(0.01)).not.toThrow();
    });

    it('should throw BudgetExceededError when budget exceeded', () => {
      // Manually inflate stats
      // Since specific methods to set stats are private, we can simulate by logging usage
      // $5 budget.
      // 1000 completion tokens costs ~$0.015 (gpt-4o default)
      // Let's log enough to exceed $5.
      // Need approx 333,333 tokens.

      service.logUsage({
        promptTokens: 0,
        completionTokens: 600000,
        totalTokens: 600000,
        model: 'gpt-4o',
        costEstimate: 0,
      });

      expect(() => service.checkBudget(0.01)).toThrow(BudgetExceededError);
    });

    it('should throw immediately if Kill Switch is active', async () => {
      // Re-init with kill switch active
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'AI_KILL_SWITCH') return 'true';
        return '5.00';
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AIMonitoringService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const killedService =
        module.get<AIMonitoringService>(AIMonitoringService);

      expect(() => killedService.checkBudget(0.01)).toThrow(
        'Kill Switch is ACTIVE',
      );
    });
  });
});

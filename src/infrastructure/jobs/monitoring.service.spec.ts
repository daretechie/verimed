import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringService } from './monitoring.service';
import { VerifyProviderUseCase } from '../../application/use-cases/verify-provider.use-case';

describe('MonitoringService', () => {
  let service: MonitoringService;

  const mockVerifyUseCase = {
    execute: jest.fn(),
  };

  const mockRepository = {
    findExpiringVerifications: jest.fn(),
    findExpiredVerifications: jest.fn(),
    findVerifiedProviders: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringService,
        {
          provide: VerifyProviderUseCase,
          useValue: mockVerifyUseCase,
        },
        {
          provide: 'VerificationRepository',
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
  });

  describe('getVerificationStats', () => {
    it('should return verification stats', async () => {
      mockRepository.findExpiringVerifications.mockResolvedValue([
        { providerId: 'prov-1', getDaysUntilExpiration: () => 7 },
        { providerId: 'prov-2', getDaysUntilExpiration: () => 10 },
      ]);
      mockRepository.findExpiredVerifications.mockResolvedValue([
        { providerId: 'prov-3', getDaysUntilExpiration: () => -5 },
      ]);

      const stats = await service.getVerificationStats();

      expect(stats.expiringSoon).toBe(2);
      expect(stats.expired).toBe(1);
      expect(stats.total).toBe(3);
      expect(stats.verificationWindowDays).toBe(120);
    });
  });

  describe('checkExpiringVerifications', () => {
    it('should log expiring verifications', async () => {
      mockRepository.findExpiringVerifications.mockResolvedValue([
        {
          providerId: 'prov-1',
          countryCode: 'US',
          getDaysUntilExpiration: () => 7,
        },
      ]);
      mockRepository.findExpiredVerifications.mockResolvedValue([]);

      await expect(service.checkExpiringVerifications()).resolves.not.toThrow();
    });

    it('should handle empty results', async () => {
      mockRepository.findExpiringVerifications.mockResolvedValue([]);
      mockRepository.findExpiredVerifications.mockResolvedValue([]);

      await expect(service.checkExpiringVerifications()).resolves.not.toThrow();
    });

    it('should handle errors gracefully', async () => {
      mockRepository.findExpiringVerifications.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(service.checkExpiringVerifications()).resolves.not.toThrow();
    });
  });

  describe('autoReverifyExpired', () => {
    it('should re-verify expired providers', async () => {
      mockRepository.findExpiredVerifications.mockResolvedValue([
        { providerId: 'prov-1', countryCode: 'US' },
      ]);
      mockRepository.findVerifiedProviders.mockResolvedValue([
        {
          providerId: 'prov-1',
          countryCode: 'US',
          firstName: 'John',
          lastName: 'Smith',
        },
      ]);
      mockVerifyUseCase.execute.mockResolvedValue({ status: 'VERIFIED' });

      await expect(service.autoReverifyExpired()).resolves.not.toThrow();

      expect(mockVerifyUseCase.execute).toHaveBeenCalled();
    });

    it('should handle no expired verifications', async () => {
      mockRepository.findExpiredVerifications.mockResolvedValue([]);

      await expect(service.autoReverifyExpired()).resolves.not.toThrow();
    });

    it('should handle re-verification errors gracefully', async () => {
      mockRepository.findExpiredVerifications.mockResolvedValue([
        { providerId: 'prov-1' },
      ]);
      mockRepository.findVerifiedProviders.mockResolvedValue([
        { providerId: 'prov-1' },
      ]);
      mockVerifyUseCase.execute.mockRejectedValue(
        new Error('Verification failed'),
      );

      await expect(service.autoReverifyExpired()).resolves.not.toThrow();
    });
  });
});

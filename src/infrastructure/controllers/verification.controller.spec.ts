import { Test, TestingModule } from '@nestjs/testing';
import { VerificationController } from './verification.controller';
import { VerifyProviderUseCase } from '../../application/use-cases/verify-provider.use-case';
import { WebhookService } from '../services/webhook.service';
import { VerificationStatus } from '../../domain/enums/verification-status.enum';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { AuthGuard } from '@nestjs/passport';
import { EnterpriseGuard } from '../guards/enterprise.guard';

describe('VerificationController', () => {
  let controller: VerificationController;

  const mockVerifyUseCase = {
    execute: jest.fn(),
  };

  const mockRepository = {
    findById: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockWebhookService = {
    notifyVerificationCompleted: jest.fn(),
    notifyBatchCompleted: jest.fn(),
    notifyVerificationExpiring: jest.fn(),
    notifySanctionsMatch: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-api-key'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VerificationController],
      providers: [
        {
          provide: VerifyProviderUseCase,
          useValue: mockVerifyUseCase,
        },
        {
          provide: 'VerificationRepository',
          useValue: mockRepository,
        },
        {
          provide: WebhookService,
          useValue: mockWebhookService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .overrideGuard(EnterpriseGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<VerificationController>(VerificationController);
  });

  describe('verify', () => {
    it('should verify a provider', async () => {
      const mockResult = {
        transactionId: 'tx-123',
        status: VerificationStatus.VERIFIED,
        method: 'API_REGISTRY',
        confidenceScore: 0.95,
      };
      mockVerifyUseCase.execute.mockResolvedValue(mockResult);
      mockWebhookService.notifyVerificationCompleted.mockResolvedValue(
        undefined,
      );

      const result = await controller.verify(
        {
          providerId: 'prov-001',
          countryCode: 'US',
          firstName: 'John',
          lastName: 'Smith',
          licenseNumber: '1234567890',
        },
        {},
      );

      expect(result.status).toBe(VerificationStatus.VERIFIED);
    });
  });

  describe('verifyBatch', () => {
    it('should verify multiple providers', async () => {
      const mockResult = {
        transactionId: 'tx-123',
        status: VerificationStatus.VERIFIED,
        method: 'API_REGISTRY',
        confidenceScore: 0.95,
      };
      mockVerifyUseCase.execute.mockResolvedValue(mockResult);
      mockWebhookService.notifyBatchCompleted.mockResolvedValue(undefined);

      const result = await controller.verifyBatch({
        providers: [
          {
            providerId: 'prov-001',
            countryCode: 'US',
            firstName: 'John',
            lastName: 'Smith',
          },
        ],
      });

      expect(result.batchId).toBeDefined();
      expect(result.results).toHaveLength(1);
    });
  });

  describe('getVerification', () => {
    it('should return verification by id', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'tx-123',
        providerId: 'prov-001',
        status: VerificationStatus.VERIFIED,
        method: 'API_REGISTRY',
        confidenceScore: 0.95,
        attributes: {},
        metadata: {},
        timestamp: new Date(),
      });

      const result = await controller.getVerification('tx-123');

      // Controller returns repository result directly
      expect(result.id).toBe('tx-123');
    });

    it('should throw NotFoundException when not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(controller.getVerification('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reviewVerification', () => {
    it('should update verification status', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'tx-123',
        status: VerificationStatus.MANUAL_REVIEW,
        metadata: {},
      });
      mockRepository.updateStatus.mockResolvedValue(undefined);

      const result = await controller.reviewVerification('tx-123', {
        status: VerificationStatus.VERIFIED,
        reason: 'Approved',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe(VerificationStatus.VERIFIED);
    });
  });
});

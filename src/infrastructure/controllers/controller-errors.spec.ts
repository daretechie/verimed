/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VerificationController } from './verification.controller';
import { VerifyProviderUseCase } from '../../application/use-cases/verify-provider.use-case';
import { WebhookService } from '../services/webhook.service';
import { LicenseService } from '../licensing/license.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('VerificationController (Extra Coverage)', () => {
  let controller: VerificationController;
  let useCase: VerifyProviderUseCase;
  let repository: any;

  beforeEach(async () => {
    repository = {
      findById: jest.fn(),
      updateStatus: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VerificationController],
      providers: [
        {
          provide: VerifyProviderUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: 'VerificationRepository',
          useValue: repository,
        },
        {
          provide: WebhookService,
          useValue: {
            notifyVerificationCompleted: jest.fn(),
            notifyBatchCompleted: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-key') },
        },
        {
          provide: LicenseService,
          useValue: {
            isValid: jest.fn().mockReturnValue(true),
            getPlan: jest.fn().mockReturnValue('ENTERPRISE'),
          },
        },
      ],
    }).compile();

    controller = module.get<VerificationController>(VerificationController);
    useCase = module.get<VerifyProviderUseCase>(VerifyProviderUseCase);
  });

  it('should throw BadRequestException for invalid file type', async () => {
    const mockFile = {
      buffer: Buffer.from('not a real file'),
      originalname: 'test.txt',
      mimetype: 'text/plain',
    } as any;

    await expect(
      controller.verify({} as any, { documents: [mockFile] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should handle batch errors for individual providers', async () => {
    (useCase.execute as jest.Mock).mockRejectedValue(new Error('Case failed'));

    const dto = {
      providers: [
        {
          providerId: 'p1',
          countryCode: 'US',
          firstName: 'A',
          lastName: 'B',
          licenseNumber: 'L',
        },
      ],
    };

    const result = await controller.verifyBatch(dto as any);

    expect(result.results[0].status).toBe('ERROR');
    expect(result.results[0].error).toBe('Case failed');
  });

  it('should throw NotFoundException if verification not found', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(controller.getVerification('none')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw NotFoundException if verification to review not found', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(
      controller.reviewVerification('none', {} as any),
    ).rejects.toThrow(NotFoundException);
  });
});

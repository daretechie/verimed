/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { VerifyProviderUseCase } from './verify-provider.use-case';
import { IRegistryAdapter } from '../../domain/ports/registry-adapter.port';
import { IDocumentVerifier } from '../../domain/ports/document-verifier.port';
import { IVerificationRepository } from '../../domain/ports/verification-repository.port';
import { VerificationRequest } from '../../domain/entities/verification-request.entity';
import { VerificationResult } from '../../domain/entities/verification-result.entity';
import {
  VerificationStatus,
  VerificationMethod,
} from '../../domain/enums/verification-status.enum';

describe('VerifyProviderUseCase', () => {
  let useCase: VerifyProviderUseCase;
  let registryAdapter: jest.Mocked<IRegistryAdapter>;
  let documentVerifier: jest.Mocked<IDocumentVerifier>;
  let repository: jest.Mocked<IVerificationRepository>;

  beforeEach(async () => {
    registryAdapter = {
      verify: jest.fn(),
      countryCode: 'US',
      supports: jest.fn().mockReturnValue(true),
    } as any;
    documentVerifier = {
      verifyDocuments: jest.fn(),
    };
    repository = {
      save: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      findVerifiedProviders: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifyProviderUseCase,
        { provide: 'RegistryAdapters', useValue: [registryAdapter] },
        { provide: 'DocumentVerifier', useValue: documentVerifier },
        { provide: 'VerificationRepository', useValue: repository },
      ],
    }).compile();

    useCase = module.get<VerifyProviderUseCase>(VerifyProviderUseCase);
  });

  it('should verify a provider successfully', async () => {
    const request = new VerificationRequest(
      'test-id',
      'US',
      { firstName: 'John', lastName: 'Doe', licenseNumber: '123' },
      [],
    );

    const registryResult = new VerificationResult(
      VerificationStatus.VERIFIED,
      VerificationMethod.API_REGISTRY,
      new Date(),
    );

    registryAdapter.verify.mockResolvedValue(registryResult);
    documentVerifier.verifyDocuments.mockResolvedValue(
      new VerificationResult(
        VerificationStatus.VERIFIED,
        VerificationMethod.AI_DOCUMENT,
        new Date(),
      ),
    );
    repository.save.mockResolvedValue('transaction-123');

    const result = await useCase.execute(request);

    expect(result.status).toBe(VerificationStatus.VERIFIED);
    expect(registryAdapter.verify).toHaveBeenCalledWith(request);
    expect(documentVerifier.verifyDocuments).not.toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalled();
  });

  it('should fall back to manual review if registry fails but documents pass', async () => {
    const request = new VerificationRequest(
      'test-id',
      'US',
      { firstName: 'John', lastName: 'Doe', licenseNumber: '123' },
      [],
    );

    const registryResult = new VerificationResult(
      VerificationStatus.REJECTED,
      VerificationMethod.API_REGISTRY,
      new Date(),
    );

    registryAdapter.verify.mockResolvedValue(registryResult);
    documentVerifier.verifyDocuments.mockResolvedValue(
      new VerificationResult(
        VerificationStatus.VERIFIED,
        VerificationMethod.AI_DOCUMENT,
        new Date(),
      ),
    );
    repository.save.mockResolvedValue('transaction-123');

    const result = await useCase.execute(request);

    expect(result.status).toBe(VerificationStatus.MANUAL_REVIEW);
    expect(registryAdapter.verify).toHaveBeenCalledWith(request);
  });
});

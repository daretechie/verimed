/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
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
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === 'AI_CONFIDENCE_THRESHOLD') return 0.85;
              return null;
            }),
          },
        },
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

  it('should reject if country is unsupported and no documents are provided', async () => {
    registryAdapter.supports.mockReturnValue(false);
    const request = new VerificationRequest(
      'test-id',
      'XX',
      { firstName: 'John', lastName: 'Doe', licenseNumber: '123' },
      [],
    );
    repository.save.mockResolvedValue('transaction-456');

    const result = await useCase.execute(request);

    expect(result.status).toBe(VerificationStatus.REJECTED);
    expect(result.metadata.reason).toBe(
      'Document required for unsupported country',
    );
    expect(repository.save).toHaveBeenCalled();
  });

  it('should proceed with AI if country is unsupported but documents are provided', async () => {
    registryAdapter.supports.mockReturnValue(false);
    const request = new VerificationRequest(
      'test-id',
      'XX',
      { firstName: 'John', lastName: 'Doe', licenseNumber: '123' },
      [{ buffer: Buffer.from('doc'), mimetype: 'application/pdf' }],
    );
    documentVerifier.verifyDocuments.mockResolvedValue(
      new VerificationResult(
        VerificationStatus.VERIFIED,
        VerificationMethod.AI_DOCUMENT,
        new Date(),
      ),
    );
    repository.save.mockResolvedValue('transaction-789');

    const result = await useCase.execute(request);

    expect(result.status).toBe(VerificationStatus.MANUAL_REVIEW);
    expect(documentVerifier.verifyDocuments).toHaveBeenCalled();
  });

  it('should handle registry adapter exception and fall back to pending', async () => {
    registryAdapter.verify.mockRejectedValue(new Error('API Down'));
    const request = new VerificationRequest(
      'test-id',
      'US',
      { firstName: 'John', lastName: 'Doe', licenseNumber: '123' },
      [],
    );
    documentVerifier.verifyDocuments.mockResolvedValue(
      new VerificationResult(
        VerificationStatus.PENDING,
        VerificationMethod.AI_DOCUMENT,
        new Date(),
      ),
    );
    repository.save.mockResolvedValue('transaction-abc');

    const result = await useCase.execute(request);

    expect(result.status).toBe(VerificationStatus.PENDING);
    expect(result.method).toBe(VerificationMethod.AI_DOCUMENT);
  });

  it('should force MANUAL_REVIEW if AI confidence is below threshold', async () => {
    registryAdapter.supports.mockReturnValue(false); // Force AI path
    const request = new VerificationRequest(
      'prov-001',
      'ZZ',
      {
        firstName: 'John',
        lastName: 'Doe',
        licenseNumber: '123',
      },
      [{ buffer: Buffer.from('doc'), mimetype: 'image/jpeg' }],
    );

    documentVerifier.verifyDocuments.mockResolvedValue(
      new VerificationResult(
        VerificationStatus.VERIFIED,
        VerificationMethod.AI_DOCUMENT,
        new Date(),
        { aiReason: 'Looks okay but not sure' },
        0.7, // Below 0.85 threshold
      ),
    );

    const result = await useCase.execute(request);

    expect(result.status).toBe(VerificationStatus.MANUAL_REVIEW);
    expect(result.metadata.lowConfidence).toBe(true);
    expect(result.metadata.originalStatus).toBe(
      VerificationStatus.MANUAL_REVIEW,
    );
  });

  it('should use doc result if registry is pending', async () => {
    const registryResult = new VerificationResult(
      VerificationStatus.PENDING,
      VerificationMethod.API_REGISTRY,
      new Date(),
    );
    registryAdapter.verify.mockResolvedValue(registryResult);

    const docResult = new VerificationResult(
      VerificationStatus.REJECTED,
      VerificationMethod.AI_DOCUMENT,
      new Date(),
      { reason: 'fake' },
    );
    documentVerifier.verifyDocuments.mockResolvedValue(docResult);
    repository.save.mockResolvedValue('transaction-xyz');

    const result = await useCase.execute({
      countryCode: 'US',
      documents: [],
    } as any);

    expect(result.status).toBe(VerificationStatus.REJECTED);
  });
});

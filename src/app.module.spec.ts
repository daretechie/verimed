// Set required environment variables before importing AppModule
// This must happen at the top of the file, before any imports that trigger module loading
process.env.API_KEY = 'test-api-key';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.ADMIN_PASS = 'test-admin-pass';
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { VerifyProviderUseCase } from './application/use-cases/verify-provider.use-case';
import { IRegistryAdapter } from './domain/ports/registry-adapter.port';
import { IDocumentVerifier } from './domain/ports/document-verifier.port';
import { IVerificationRepository } from './domain/ports/verification-repository.port';

describe('AppModule', () => {
  let moduleRef: TestingModule;

  afterEach(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('should be defined and compile successfully', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef).toBeDefined();
  });

  it('should have ConfigService with correct values', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const configService = moduleRef.get(ConfigService);
    expect(configService).toBeDefined();
    expect(configService.get('API_KEY')).toBe('test-api-key');
    expect(configService.get('NODE_ENV')).toBe('test');
  });

  it('should have VerifyProviderUseCase provider', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const useCase = moduleRef.get(VerifyProviderUseCase);
    expect(useCase).toBeDefined();
  });

  it('should have RegistryAdapters with 5 country adapters', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const adapters = moduleRef.get<IRegistryAdapter[]>('RegistryAdapters');
    expect(adapters).toBeDefined();
    expect(Array.isArray(adapters)).toBe(true);
    expect(adapters.length).toBe(5); // US, FR, AE, NL, IL
  });

  it('should have DocumentVerifier provider (mock in test mode)', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const verifier = moduleRef.get<IDocumentVerifier>('DocumentVerifier');
    expect(verifier).toBeDefined();
  });

  it('should have VerificationRepository provider', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const repo = moduleRef.get<IVerificationRepository>(
      'VerificationRepository',
    );
    expect(repo).toBeDefined();
  });

  it('should select mock DocumentVerifier when AI_API_KEY is not set', async () => {
    // AI_API_KEY is not set in our test env, so mock should be used
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const verifier = moduleRef.get<IDocumentVerifier>('DocumentVerifier');
    expect(verifier.constructor.name).toBe('MockDocumentVerifier');
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ToolAccessPolicyService } from './tool-access-policy.service';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';

describe('ToolAccessPolicyService', () => {
  let service: ToolAccessPolicyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToolAccessPolicyService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ToolAccessPolicyService>(ToolAccessPolicyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateAccess', () => {
    it('should allow US NPI registry', () => {
      const result = service.validateAccess(
        'https://npiregistry.cms.hhs.gov/api/?version=2.1',
      );
      expect(result).toBe(true);
    });

    it('should allow France ANS registry', () => {
      const result = service.validateAccess(
        'https://gateway.api.esante.gouv.fr/some/endpoint',
      );
      expect(result).toBe(true);
    });

    it('should allow OpenAI API', () => {
      const result = service.validateAccess(
        'https://api.openai.com/v1/chat/completions',
      );
      expect(result).toBe(true);
    });

    it('should allow localhost for development', () => {
      const result = service.validateAccess('http://localhost:3000/test');
      expect(result).toBe(true);
    });

    it('should block AWS metadata SSRF', () => {
      expect(() => {
        service.validateAccess('http://169.254.169.254/latest/meta-data/');
      }).toThrow(ForbiddenException);
    });

    it('should block GCP metadata SSRF', () => {
      expect(() => {
        service.validateAccess(
          'http://metadata.google.internal/computeMetadata/v1/',
        );
      }).toThrow(ForbiddenException);
    });

    it('should block file:// protocol', () => {
      expect(() => {
        service.validateAccess('file:///etc/passwd');
      }).toThrow(ForbiddenException);
    });

    it('should deny unknown external URLs', () => {
      expect(() => {
        service.validateAccess('https://malicious-site.com/api');
      }).toThrow(ForbiddenException);
    });
  });

  describe('getAllowedServices', () => {
    it('should return list of allowed services', () => {
      const allowed = service.getAllowedServices();
      expect(allowed).toBeInstanceOf(Array);
      expect(allowed.length).toBeGreaterThan(0);
      expect(allowed).toContain('https://npiregistry.cms.hhs.gov/*');
    });
  });
});

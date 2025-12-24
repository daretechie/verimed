import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LicenseService } from './license.service';

describe('LicenseService', () => {
  let service: LicenseService;

  const createService = async (licenseKey: string | null) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicenseService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(licenseKey),
          },
        },
      ],
    }).compile();

    return module.get<LicenseService>(LicenseService);
  };

  it('should return false for missing license key', async () => {
    service = await createService(null);
    expect(service.isValid()).toBe(false);
    expect(service.getPlan()).toBe('COMMUNITY');
  });

  it('should return false for invalid license key', async () => {
    service = await createService('INVALID-KEY');
    expect(service.isValid()).toBe(false);
    expect(service.getPlan()).toBe('COMMUNITY');
  });

  it('should return true for enterprise license key', async () => {
    service = await createService('ENT-12345');
    expect(service.isValid()).toBe(true);
    expect(service.getPlan()).toBe('ENTERPRISE');
  });
});

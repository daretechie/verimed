import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { CredentialBadgeService } from './credential-badge.service';
import { CredentialBadgeEntity } from '../persistence/entities/credential-badge.entity';
import { VerificationLogEntity } from '../persistence/entities/verification-log.entity';

describe('CredentialBadgeService', () => {
  let service: CredentialBadgeService;

  const mockBadgeRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockVerificationRepo = {
    findOne: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialBadgeService,
        {
          provide: getRepositoryToken(CredentialBadgeEntity),
          useValue: mockBadgeRepo,
        },
        {
          provide: getRepositoryToken(VerificationLogEntity),
          useValue: mockVerificationRepo,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CredentialBadgeService>(CredentialBadgeService);
  });

  describe('createBadge', () => {
    it('should create a badge for a verified provider', async () => {
      const mockVerification = {
        id: 'ver-123',
        providerId: 'prov-001',
        countryCode: 'US',
        status: 'VERIFIED',
        attributes: { licenseNumber: '1234567890' },
        expiresAt: new Date('2025-04-20'),
      };

      mockVerificationRepo.findOne.mockResolvedValue(mockVerification);
      mockBadgeRepo.save.mockImplementation((badge) => Promise.resolve(badge));

      const result = await service.createBadge(
        'ver-123',
        'Dr. John Smith',
        'Cardiology',
      );

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('shortCode');
      expect(result.providerName).toBe('Dr. John Smith');
      expect(result.countryCode).toBe('US');
      expect(result.qrCodeDataUrl).toContain('data:image/png');
      expect(mockBadgeRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when verification not found', async () => {
      mockVerificationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createBadge('invalid-id', 'Dr. Test'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error when verification is not VERIFIED', async () => {
      mockVerificationRepo.findOne.mockResolvedValue({
        id: 'ver-123',
        status: 'PENDING',
      });

      await expect(service.createBadge('ver-123', 'Dr. Test')).rejects.toThrow(
        'Cannot create badge for non-verified provider',
      );
    });
  });

  describe('verifyByShortCode', () => {
    it('should return badge and update verification count', async () => {
      const mockBadge = createMockBadge();
      mockBadgeRepo.findOne.mockResolvedValue(mockBadge);
      mockBadgeRepo.save.mockResolvedValue(mockBadge);

      const result = await service.verifyByShortCode('ABCD1234');

      expect(result.shortCode).toBe('ABCD1234');
      expect(mockBadgeRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when badge not found', async () => {
      mockBadgeRepo.findOne.mockResolvedValue(null);

      await expect(service.verifyByShortCode('INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getBadgeById', () => {
    it('should return badge by id', async () => {
      const mockBadge = createMockBadge();
      mockBadgeRepo.findOne.mockResolvedValue(mockBadge);

      const result = await service.getBadgeById('badge-123');

      expect(result.id).toBe('badge-123');
    });

    it('should throw NotFoundException when badge not found', async () => {
      mockBadgeRepo.findOne.mockResolvedValue(null);

      await expect(service.getBadgeById('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getBadgesByProviderId', () => {
    it('should return all badges for a provider', async () => {
      const mockBadges = [createMockBadge(), createMockBadge()];
      mockBadgeRepo.find.mockResolvedValue(mockBadges);

      const result = await service.getBadgesByProviderId('prov-001');

      expect(result).toHaveLength(2);
      expect(mockBadgeRepo.find).toHaveBeenCalledWith({
        where: { providerId: 'prov-001' },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no badges found', async () => {
      mockBadgeRepo.find.mockResolvedValue([]);

      const result = await service.getBadgesByProviderId('no-badges');

      expect(result).toHaveLength(0);
    });
  });

  describe('revokeBadge', () => {
    it('should revoke a badge', async () => {
      const mockBadge = createMockBadge();
      mockBadgeRepo.findOne.mockResolvedValue(mockBadge);
      mockBadgeRepo.save.mockResolvedValue({ ...mockBadge, status: 'REVOKED' });

      await service.revokeBadge('badge-123', 'Security violation');

      expect(mockBadge.status).toBe('REVOKED');
      expect(mockBadgeRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when badge not found', async () => {
      mockBadgeRepo.findOne.mockResolvedValue(null);

      await expect(service.revokeBadge('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateExpiredBadges', () => {
    it('should update expired badges', async () => {
      mockBadgeRepo.update.mockResolvedValue({ affected: 5 });

      const result = await service.updateExpiredBadges();

      expect(result).toBe(5);
      expect(mockBadgeRepo.update).toHaveBeenCalled();
    });

    it('should return 0 when no badges expired', async () => {
      mockBadgeRepo.update.mockResolvedValue({ affected: 0 });

      const result = await service.updateExpiredBadges();

      expect(result).toBe(0);
    });
  });

  // Helper function to create mock badge
  function createMockBadge(): CredentialBadgeEntity {
    const badge = new CredentialBadgeEntity();
    badge.id = 'badge-123';
    badge.shortCode = 'ABCD1234';
    badge.providerId = 'prov-001';
    badge.verificationId = 'ver-123';
    badge.providerName = 'Dr. John Smith';
    badge.countryCode = 'US';
    badge.licenseNumber = '1234567890';
    badge.specialty = 'Cardiology';
    badge.status = 'ACTIVE';
    badge.issuedAt = new Date();
    badge.expiresAt = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000);
    badge.qrCodeDataUrl = 'data:image/png;base64,...';
    badge.createdAt = new Date();
    badge.verificationCount = 0;
    return badge;
  }
});

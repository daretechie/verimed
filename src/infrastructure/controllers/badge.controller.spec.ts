import { Test, TestingModule } from '@nestjs/testing';
import { BadgeController } from './badge.controller';
import {
  CredentialBadgeService,
  BadgeResponse,
} from '../services/credential-badge.service';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from '../guards/api-key.guard';

describe('BadgeController', () => {
  let controller: BadgeController;
  let mockBadgeService: Partial<CredentialBadgeService>;

  const mockBadgeResponse: BadgeResponse = {
    id: 'badge-123',
    shortCode: 'ABCD1234',
    providerName: 'Dr. John Smith',
    countryCode: 'US',
    licenseNumber: '1234567890',
    specialty: 'Cardiology',
    status: 'ACTIVE',
    issuedAt: '2025-01-01T00:00:00Z',
    expiresAt: '2025-04-30T00:00:00Z',
    verificationUrl: 'http://localhost:3000/badge/verify/ABCD1234',
    qrCodeDataUrl: 'data:image/png;base64,...',
    isValid: true,
    daysUntilExpiration: 120,
  };

  beforeEach(async () => {
    mockBadgeService = {
      createBadge: jest.fn().mockResolvedValue(mockBadgeResponse),
      verifyByShortCode: jest.fn().mockResolvedValue(mockBadgeResponse),
      getBadgeById: jest.fn().mockResolvedValue(mockBadgeResponse),
      getBadgesByProviderId: jest.fn().mockResolvedValue([mockBadgeResponse]),
      revokeBadge: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BadgeController],
      providers: [
        {
          provide: CredentialBadgeService,
          useValue: mockBadgeService,
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-api-key') },
        },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BadgeController>(BadgeController);
  });

  describe('createBadge', () => {
    it('should create a badge', async () => {
      const result = await controller.createBadge({
        verificationId: 'ver-123',
        providerName: 'Dr. John Smith',
        specialty: 'Cardiology',
      });

      expect(result).toEqual(mockBadgeResponse);
      expect(mockBadgeService.createBadge).toHaveBeenCalledWith(
        'ver-123',
        'Dr. John Smith',
        'Cardiology',
      );
    });
  });

  describe('verifyBadge', () => {
    it('should verify a badge by short code', async () => {
      const result = await controller.verifyBadge('ABCD1234');

      expect(result).toEqual(mockBadgeResponse);
      expect(mockBadgeService.verifyByShortCode).toHaveBeenCalledWith(
        'ABCD1234',
      );
    });

    it('should throw NotFoundException for invalid code', async () => {
      (mockBadgeService.verifyByShortCode as jest.Mock).mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.verifyBadge('INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getBadge', () => {
    it('should get badge by id', async () => {
      const result = await controller.getBadge('badge-123');

      expect(result).toEqual(mockBadgeResponse);
    });
  });

  describe('getProviderBadges', () => {
    it('should get all badges for a provider', async () => {
      const result = await controller.getProviderBadges('prov-001');

      expect(result).toHaveLength(1);
      expect(mockBadgeService.getBadgesByProviderId).toHaveBeenCalledWith(
        'prov-001',
      );
    });
  });

  describe('revokeBadge', () => {
    it('should revoke a badge', async () => {
      const result = await controller.revokeBadge('badge-123');

      expect(result).toEqual({ success: true });
      expect(mockBadgeService.revokeBadge).toHaveBeenCalledWith('badge-123');
    });
  });
});

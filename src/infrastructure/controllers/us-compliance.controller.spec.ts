import { Test, TestingModule } from '@nestjs/testing';
import { UsComplianceController } from './us-compliance.controller';
import { DeaVerificationService } from '../services/dea-verification.service';
import { InterstateCompactService } from '../services/interstate-compact.service';
import { SanctionsCheckService } from '../services/sanctions-check.service';
import { ConfigService } from '@nestjs/config';

describe('UsComplianceController', () => {
  let controller: UsComplianceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsComplianceController],
      providers: [
        DeaVerificationService,
        InterstateCompactService,
        SanctionsCheckService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<UsComplianceController>(UsComplianceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('DEA Verification', () => {
    it('should verify a valid DEA number', async () => {
      // Valid DEA: AB1234563 (checksum verified)
      const result = await controller.verifyDea({ deaNumber: 'AB1234563' });
      expect(result.isValid).toBe(true);
      expect(result.source).toBe('FORMAT_VALIDATION');
    });

    it('should reject an invalid DEA number', async () => {
      const result = await controller.verifyDea({ deaNumber: 'INVALID' });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid DEA');
    });

    it('should return registrant types', () => {
      const types = controller.getRegistrantTypes();
      expect(types.A).toBe('Physician/Dentist/Veterinarian');
      expect(types.M).toBe('Mid-level Practitioner');
    });
  });

  describe('Interstate Compact', () => {
    it('should check IMLC eligibility for Texas (member)', () => {
      const result = controller.getCompactEligibility('TX', 'PHYSICIAN');
      expect(result.isEligible).toBe(false); // TX is not in IMLC
    });

    it('should check IMLC eligibility for Colorado (member)', () => {
      const result = controller.getCompactEligibility('CO', 'PHYSICIAN');
      expect(result.isEligible).toBe(true);
      expect(result.compacts[0].type).toBe('IMLC');
    });

    it('should check NLC eligibility for Texas (member)', () => {
      const result = controller.getCompactEligibility('TX', 'NURSE');
      expect(result.isEligible).toBe(true);
      expect(result.compacts[0].type).toBe('NLC');
    });

    it('should check if provider can practice across states', () => {
      const result = controller.canPracticeInState('CO', 'AZ', 'PHYSICIAN');
      expect(result.canPractice).toBe(true);
    });

    it('should return IMLC members', () => {
      const result = controller.getImlcMembers();
      expect(result.compact).toBe('IMLC');
      expect(result.memberStates).toContain('CO');
      expect(result.totalMembers).toBeGreaterThan(40);
    });

    it('should return NLC members', () => {
      const result = controller.getNlcMembers();
      expect(result.compact).toBe('NLC');
      expect(result.memberStates).toContain('TX');
      expect(result.totalMembers).toBeGreaterThan(40);
    });
  });

  describe('Sanctions Check', () => {
    it('should check sanctions for a provider', async () => {
      const result = await controller.checkSanctions({
        firstName: 'John',
        lastName: 'Smith',
        state: 'TX',
      });
      expect(result).toHaveProperty('isExcluded');
      expect(result).toHaveProperty('source');
      expect(result).toHaveProperty('matches');
      expect(result).toHaveProperty('checkedAt');
    });

    it('should return sanctions sources', () => {
      const result = controller.getSanctionsSources();
      expect(result.sources).toContain('GSA_SAM');
      expect(result.sources).toContain('OIG_LEIE');
      expect(result.description).toHaveProperty('OIG_LEIE');
      expect(result.description).toHaveProperty('GSA_SAM');
    });
  });
});

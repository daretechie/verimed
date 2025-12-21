import { InterstateCompactService, CompactType } from './interstate-compact.service';

describe('InterstateCompactService', () => {
  let service: InterstateCompactService;

  beforeEach(() => {
    service = new InterstateCompactService();
  });

  describe('isImlcMember', () => {
    it('should return true for IMLC member states', () => {
      expect(service.isImlcMember('TX')).toBe(false); // TX not in IMLC
      expect(service.isImlcMember('CO')).toBe(true); // CO is in IMLC
      expect(service.isImlcMember('FL')).toBe(true); // FL is in IMLC
    });

    it('should handle lowercase state codes', () => {
      expect(service.isImlcMember('co')).toBe(true);
    });
  });

  describe('isNlcMember', () => {
    it('should return true for NLC member states', () => {
      expect(service.isNlcMember('TX')).toBe(true); // TX is in NLC
      expect(service.isNlcMember('CA')).toBe(false); // CA not in NLC
    });
  });

  describe('getImlcMemberStates', () => {
    it('should return 45 IMLC member states', () => {
      const states = service.getImlcMemberStates();
      expect(states.length).toBe(45);
      expect(states).toContain('CO');
      expect(states).toContain('FL');
    });
  });

  describe('getNlcMemberStates', () => {
    it('should return 42 NLC member states', () => {
      const states = service.getNlcMemberStates();
      expect(states.length).toBe(42);
      expect(states).toContain('TX');
    });
  });

  describe('getCompactEligibility', () => {
    it('should return eligibility for physician in IMLC state', () => {
      const result = service.getCompactEligibility('CO', 'PHYSICIAN');

      expect(result.isEligible).toBe(true);
      expect(result.homeState).toBe('CO');
      expect(result.compacts[0].type).toBe(CompactType.IMLC);
      expect(result.compacts[0].isMember).toBe(true);
      expect(result.compacts[0].totalEligibleStates).toBe(44); // 45 - home state
    });

    it('should return non-eligibility for physician in non-IMLC state', () => {
      const result = service.getCompactEligibility('CA', 'PHYSICIAN');

      expect(result.isEligible).toBe(false);
      expect(result.compacts[0].isMember).toBe(false);
      expect(result.compacts[0].eligibleStates.length).toBe(0);
    });

    it('should return eligibility for nurse in NLC state', () => {
      const result = service.getCompactEligibility('TX', 'NURSE');

      expect(result.isEligible).toBe(true);
      expect(result.compacts[0].type).toBe(CompactType.NLC);
      expect(result.compacts[0].isMember).toBe(true);
    });
  });

  describe('getStateInfo', () => {
    it('should return state info with compacts', () => {
      const info = service.getStateInfo('CO');

      expect(info.state).toBe('CO');
      expect(info.stateName).toBe('Colorado');
      expect(info.compacts).toContain(CompactType.IMLC);
    });
  });

  describe('canShareLicense', () => {
    it('should return true for two IMLC states', () => {
      expect(service.canShareLicense('CO', 'FL', 'PHYSICIAN')).toBe(true);
    });

    it('should return false when one state is not IMLC member', () => {
      expect(service.canShareLicense('CO', 'CA', 'PHYSICIAN')).toBe(false);
    });

    it('should return true for same state', () => {
      expect(service.canShareLicense('CA', 'CA', 'PHYSICIAN')).toBe(true);
    });

    it('should check NLC for nurses', () => {
      expect(service.canShareLicense('TX', 'FL', 'NURSE')).toBe(true);
    });
  });

  describe('getAllStatesWithCompactStatus', () => {
    it('should return info for all states', () => {
      const allStates = service.getAllStatesWithCompactStatus();
      expect(allStates.length).toBeGreaterThan(50); // All US states + territories
    });
  });
});

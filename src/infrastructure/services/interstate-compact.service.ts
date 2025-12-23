import { Injectable, Logger } from '@nestjs/common';

/**
 * Interstate Compact Types
 */
export enum CompactType {
  IMLC = 'IMLC', // Interstate Medical Licensure Compact (Physicians)
  NLC = 'NLC', // Nurse Licensure Compact
  PTLC = 'PTLC', // Physical Therapy Licensure Compact
  ASLP = 'ASLP', // Audiology and Speech-Language Pathology Compact
  PSY = 'PSY', // Psychology Interjurisdictional Compact
  EMS = 'EMS', // Emergency Medical Services Compact
  OCC = 'OCC', // Occupational Therapy Compact
}

/**
 * IMLC Member States (as of 2025)
 * Interstate Medical Licensure Compact - 43 member states + DC + Guam
 */
const IMLC_MEMBER_STATES = new Set([
  'AL',
  'AZ',
  'AR',
  'CO',
  'CT',
  'DE',
  'DC',
  'FL',
  'GA',
  'GU', // 10
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MI', // 20
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'ND', // 30
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'UT',
  'VT', // 40
  'VA',
  'WA',
  'WV',
  'WI',
  'WY', // 45
]);

/**
 * NLC Member States (Nursing - as of 2025)
 * 42 states + territories
 */
const NLC_MEMBER_STATES = new Set([
  'AL',
  'AZ',
  'AR',
  'CO',
  'DE',
  'FL',
  'GA',
  'ID',
  'IN',
  'IA', // 10
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MO',
  'MS',
  'MT',
  'NE',
  'NH', // 20
  'NM',
  'NC',
  'ND',
  'OH',
  'OK',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT', // 30
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
  'NJ',
  'PA',
  'MI',
  'MN', // 40
  'OR',
  'AK', // 42
]);

/**
 * State Information
 */
interface StateCompactInfo {
  state: string;
  stateName: string;
  compacts: CompactType[];
  imlcJoinDate?: string;
  nlcJoinDate?: string;
}

/**
 * State Name Mapping
 */
const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  GU: 'Guam',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  PR: 'Puerto Rico',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  VI: 'Virgin Islands',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
};

/**
 * Compact Eligibility Result
 */
export interface CompactEligibilityResult {
  isEligible: boolean;
  homeState: string;
  homeStateName: string;
  compacts: {
    type: CompactType;
    name: string;
    isMember: boolean;
    eligibleStates: string[];
    totalEligibleStates: number;
  }[];
  message: string;
}

/**
 * Interstate Compact Service
 *
 * Provides information about interstate licensure compacts that allow
 * healthcare providers to practice across state lines.
 *
 * Supported Compacts:
 * - IMLC: Interstate Medical Licensure Compact (Physicians)
 * - NLC: Nurse Licensure Compact
 */
@Injectable()
export class InterstateCompactService {
  private readonly logger = new Logger(InterstateCompactService.name);

  /**
   * Check if a state is a member of IMLC (physicians)
   */
  isImlcMember(stateCode: string): boolean {
    return IMLC_MEMBER_STATES.has(stateCode.toUpperCase());
  }

  /**
   * Check if a state is a member of NLC (nurses)
   */
  isNlcMember(stateCode: string): boolean {
    return NLC_MEMBER_STATES.has(stateCode.toUpperCase());
  }

  /**
   * Get all IMLC member states
   */
  getImlcMemberStates(): string[] {
    return Array.from(IMLC_MEMBER_STATES);
  }

  /**
   * Get all NLC member states
   */
  getNlcMemberStates(): string[] {
    return Array.from(NLC_MEMBER_STATES);
  }

  /**
   * Get compact eligibility for a provider based on their home state
   */
  getCompactEligibility(
    homeState: string,
    providerType: 'PHYSICIAN' | 'NURSE' = 'PHYSICIAN',
  ): CompactEligibilityResult {
    const state = homeState.toUpperCase();
    const stateName = STATE_NAMES[state] || state;

    const compacts: CompactEligibilityResult['compacts'] = [];

    if (providerType === 'PHYSICIAN') {
      const isMember = this.isImlcMember(state);
      const eligibleStates = isMember
        ? this.getImlcMemberStates().filter((s) => s !== state)
        : [];

      compacts.push({
        type: CompactType.IMLC,
        name: 'Interstate Medical Licensure Compact',
        isMember,
        eligibleStates,
        totalEligibleStates: eligibleStates.length,
      });
    } else if (providerType === 'NURSE') {
      const isMember = this.isNlcMember(state);
      const eligibleStates = isMember
        ? this.getNlcMemberStates().filter((s) => s !== state)
        : [];

      compacts.push({
        type: CompactType.NLC,
        name: 'Nurse Licensure Compact',
        isMember,
        eligibleStates,
        totalEligibleStates: eligibleStates.length,
      });
    }

    const isEligible = compacts.some((c) => c.isMember);
    const message = isEligible
      ? `${stateName} is a member of interstate compact(s). Provider may practice in ${compacts[0]?.totalEligibleStates || 0} additional states.`
      : `${stateName} is not a member of any interstate compact. Provider can only practice in ${stateName}.`;

    this.logger.log(
      `[Compact] ${state} eligibility: ${isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}`,
    );

    return {
      isEligible,
      homeState: state,
      homeStateName: stateName,
      compacts,
      message,
    };
  }

  /**
   * Get state compact information
   */
  getStateInfo(stateCode: string): StateCompactInfo {
    const state = stateCode.toUpperCase();
    const compacts: CompactType[] = [];

    if (this.isImlcMember(state)) compacts.push(CompactType.IMLC);
    if (this.isNlcMember(state)) compacts.push(CompactType.NLC);

    return {
      state,
      stateName: STATE_NAMES[state] || state,
      compacts,
    };
  }

  /**
   * Get all states with compact membership status
   */
  getAllStatesWithCompactStatus(): StateCompactInfo[] {
    return Object.keys(STATE_NAMES).map((state) => this.getStateInfo(state));
  }

  /**
   * Check if two states can share a license under any compact
   */
  canShareLicense(
    homeState: string,
    targetState: string,
    providerType: 'PHYSICIAN' | 'NURSE' = 'PHYSICIAN',
  ): boolean {
    const home = homeState.toUpperCase();
    const target = targetState.toUpperCase();

    if (home === target) return true;

    if (providerType === 'PHYSICIAN') {
      return this.isImlcMember(home) && this.isImlcMember(target);
    } else {
      return this.isNlcMember(home) && this.isNlcMember(target);
    }
  }
}

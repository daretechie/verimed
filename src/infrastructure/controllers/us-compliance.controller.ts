import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../guards/api-key.guard';
import {
  DeaVerificationService,
  DeaVerificationResult,
} from '../services/dea-verification.service';
import { InterstateCompactService } from '../services/interstate-compact.service';
import type { CompactEligibilityResult } from '../services/interstate-compact.service';
import { SanctionsCheckService } from '../services/sanctions-check.service';
import type { SanctionsCheckResult } from '../services/sanctions-check.service';

class VerifyDeaDto {
  deaNumber!: string;
  lastName?: string;
}

class CheckSanctionsDto {
  npi?: string;
  firstName?: string;
  lastName?: string;
  state?: string;
}

@ApiTags('US Compliance (US Providers Only)')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('us')
export class UsComplianceController {
  constructor(
    private readonly deaService: DeaVerificationService,
    private readonly compactService: InterstateCompactService,
    private readonly sanctionsService: SanctionsCheckService,
  ) {}

  // ==================== DEA Verification ====================

  @Post('dea/verify')
  @ApiOperation({
    summary: 'Verify a DEA registration number',
    description:
      'Validates DEA number format, checksum, and optionally checks against the DEA API if configured.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['deaNumber'],
      properties: {
        deaNumber: {
          type: 'string',
          example: 'AB1234563',
          description: '9-character DEA registration number',
        },
        lastName: {
          type: 'string',
          example: 'Smith',
          description:
            'Provider last name (optional, used for additional validation)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'DEA verification result',
    schema: {
      type: 'object',
      properties: {
        isValid: { type: 'boolean' },
        deaNumber: { type: 'string' },
        registrantType: { type: 'string' },
        error: { type: 'string' },
        verifiedAt: { type: 'string' },
        source: { type: 'string', enum: ['DEA_API', 'FORMAT_VALIDATION'] },
      },
    },
  })
  async verifyDea(@Body() dto: VerifyDeaDto): Promise<DeaVerificationResult> {
    return this.deaService.verify(dto.deaNumber, dto.lastName);
  }

  @Get('dea/registrant-types')
  @ApiOperation({
    summary: 'Get all DEA registrant type codes and descriptions',
  })
  @ApiResponse({ status: 200, description: 'List of DEA registrant types' })
  getRegistrantTypes() {
    return {
      A: 'Physician/Dentist/Veterinarian',
      B: 'Medical Practitioner',
      C: 'Manufacturer',
      D: 'Distributor',
      E: 'Researcher',
      F: 'Automated Dispensing',
      G: 'Teaching Institution',
      H: 'Hospital/Clinic',
      J: 'Importer/Exporter',
      K: 'Retail Pharmacy',
      M: 'Mid-level Practitioner',
      N: 'Narcotic Treatment Program',
      P: 'Long Term Care Pharmacy',
      R: 'Retail Pharmacy',
      U: 'DoD/VA Facility',
      X: 'DATA-Waived Practitioner',
    };
  }

  // ==================== Interstate Compact ====================

  @Get('compact/:state')
  @ApiOperation({
    summary: 'Check interstate compact eligibility for a state',
    description:
      'Returns IMLC (physicians) or NLC (nurses) compact membership and eligible practice states.',
  })
  @ApiParam({
    name: 'state',
    description: 'Two-letter US state code',
    example: 'TX',
  })
  @ApiQuery({
    name: 'providerType',
    required: false,
    enum: ['PHYSICIAN', 'NURSE'],
    description: 'Type of provider (default: PHYSICIAN)',
  })
  @ApiResponse({
    status: 200,
    description: 'Compact eligibility result',
    schema: {
      type: 'object',
      properties: {
        isEligible: { type: 'boolean' },
        homeState: { type: 'string' },
        homeStateName: { type: 'string' },
        compacts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              name: { type: 'string' },
              isMember: { type: 'boolean' },
              totalEligibleStates: { type: 'number' },
            },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  getCompactEligibility(
    @Param('state') state: string,
    @Query('providerType') providerType?: 'PHYSICIAN' | 'NURSE',
  ): CompactEligibilityResult {
    return this.compactService.getCompactEligibility(
      state,
      providerType || 'PHYSICIAN',
    );
  }

  @Get('compact/:homeState/can-practice/:targetState')
  @ApiOperation({
    summary: 'Check if a provider can practice in another state',
    description:
      'Determines if license sharing is possible between two states under a compact.',
  })
  @ApiParam({
    name: 'homeState',
    description: 'Provider home state',
    example: 'TX',
  })
  @ApiParam({
    name: 'targetState',
    description: 'Target practice state',
    example: 'FL',
  })
  @ApiQuery({
    name: 'providerType',
    required: false,
    enum: ['PHYSICIAN', 'NURSE'],
  })
  @ApiResponse({ status: 200, description: 'License sharing eligibility' })
  canPracticeInState(
    @Param('homeState') homeState: string,
    @Param('targetState') targetState: string,
    @Query('providerType') providerType?: 'PHYSICIAN' | 'NURSE',
  ) {
    const canShare = this.compactService.canShareLicense(
      homeState,
      targetState,
      providerType || 'PHYSICIAN',
    );

    return {
      homeState: homeState.toUpperCase(),
      targetState: targetState.toUpperCase(),
      providerType: providerType || 'PHYSICIAN',
      canPractice: canShare,
      message: canShare
        ? `Provider from ${homeState.toUpperCase()} CAN practice in ${targetState.toUpperCase()} under interstate compact.`
        : `Provider from ${homeState.toUpperCase()} CANNOT practice in ${targetState.toUpperCase()}. Separate license required.`,
    };
  }

  @Get('compact/members/imlc')
  @ApiOperation({ summary: 'Get all IMLC member states (physicians)' })
  @ApiResponse({ status: 200, description: 'List of IMLC member states' })
  getImlcMembers() {
    return {
      compact: 'IMLC',
      name: 'Interstate Medical Licensure Compact',
      memberStates: this.compactService.getImlcMemberStates(),
      totalMembers: this.compactService.getImlcMemberStates().length,
    };
  }

  @Get('compact/members/nlc')
  @ApiOperation({ summary: 'Get all NLC member states (nurses)' })
  @ApiResponse({ status: 200, description: 'List of NLC member states' })
  getNlcMembers() {
    return {
      compact: 'NLC',
      name: 'Nurse Licensure Compact',
      memberStates: this.compactService.getNlcMemberStates(),
      totalMembers: this.compactService.getNlcMemberStates().length,
    };
  }

  // ==================== Sanctions/Exclusion Checking ====================

  @Post('sanctions/check')
  @ApiOperation({
    summary: 'Check if a provider is on federal exclusion lists',
    description:
      'Checks the OIG LEIE (Medicare/Medicaid exclusions) and GSA SAM (federal debarment) databases.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        npi: {
          type: 'string',
          example: '1234567890',
          description: 'National Provider Identifier',
        },
        firstName: {
          type: 'string',
          example: 'John',
          description: 'Provider first name',
        },
        lastName: {
          type: 'string',
          example: 'Smith',
          description: 'Provider last name',
        },
        state: {
          type: 'string',
          example: 'TX',
          description: 'State code (optional)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Sanctions check result',
    schema: {
      type: 'object',
      properties: {
        isExcluded: { type: 'boolean' },
        source: { type: 'string', enum: ['OIG_LEIE', 'GSA_SAM', 'COMBINED'] },
        matches: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              source: { type: 'string' },
              name: { type: 'string' },
              npi: { type: 'string' },
              exclusionType: { type: 'string' },
              exclusionDate: { type: 'string' },
              state: { type: 'string' },
            },
          },
        },
        checkedAt: { type: 'string' },
      },
    },
  })
  async checkSanctions(
    @Body() dto: CheckSanctionsDto,
  ): Promise<SanctionsCheckResult> {
    return this.sanctionsService.checkSanctions(
      dto.npi,
      dto.firstName,
      dto.lastName,
      dto.state,
    );
  }

  @Get('sanctions/sources')
  @ApiOperation({ summary: 'Get list of supported exclusion list sources' })
  @ApiResponse({ status: 200, description: 'List of exclusion databases' })
  getSanctionsSources() {
    return {
      sources: this.sanctionsService.getSupportedSources(),
      description: {
        OIG_LEIE:
          'Office of Inspector General - List of Excluded Individuals/Entities (Medicare/Medicaid)',
        GSA_SAM:
          'General Services Administration - System for Award Management (Federal Debarment)',
      },
      note: 'These are US federal exclusion lists. Check monthly for updates.',
    };
  }
}

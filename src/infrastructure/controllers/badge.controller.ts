import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiSecurity,
  ApiBody,
} from '@nestjs/swagger';
import {
  CredentialBadgeService,
  BadgeResponse,
} from '../services/credential-badge.service';
import { ApiKeyGuard } from '../guards/api-key.guard';

/**
 * Create Badge DTO
 */
class CreateBadgeDto {
  verificationId!: string;
  providerName!: string;
  specialty?: string;
}

/**
 * Credential Badge Controller
 *
 * Endpoints for managing portable credential badges with QR verification.
 */
@ApiTags('Credential Badges')
@Controller('badge')
export class BadgeController {
  constructor(private readonly badgeService: CredentialBadgeService) {}

  /**
   * Create a new badge for a verified provider
   */
  @Post()
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({
    summary: 'Create a credential badge for a verified provider',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['verificationId', 'providerName'],
      properties: {
        verificationId: {
          type: 'string',
          description: 'Transaction ID from verification',
        },
        providerName: { type: 'string', description: 'Provider display name' },
        specialty: { type: 'string', description: 'Optional specialty' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Badge created successfully' })
  @ApiResponse({ status: 404, description: 'Verification not found' })
  async createBadge(@Body() dto: CreateBadgeDto): Promise<BadgeResponse> {
    return this.badgeService.createBadge(
      dto.verificationId,
      dto.providerName,
      dto.specialty,
    );
  }

  /**
   * Public endpoint - Verify a badge by short code
   * No authentication required - meant for public verification
   */
  @Get('verify/:shortCode')
  @ApiOperation({ summary: 'Publicly verify a credential badge by short code' })
  @ApiParam({ name: 'shortCode', description: '8-character badge code' })
  @ApiResponse({ status: 200, description: 'Badge verification result' })
  @ApiResponse({ status: 404, description: 'Badge not found' })
  async verifyBadge(
    @Param('shortCode') shortCode: string,
  ): Promise<BadgeResponse> {
    return this.badgeService.verifyByShortCode(shortCode);
  }

  /**
   * Get badge details by ID
   */
  @Get(':id')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Get badge details by ID' })
  @ApiParam({ name: 'id', description: 'Badge UUID' })
  @ApiResponse({ status: 200, description: 'Badge details' })
  @ApiResponse({ status: 404, description: 'Badge not found' })
  async getBadge(@Param('id') id: string): Promise<BadgeResponse> {
    return this.badgeService.getBadgeById(id);
  }

  /**
   * Get all badges for a provider
   */
  @Get('provider/:providerId')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Get all badges for a provider' })
  @ApiParam({ name: 'providerId', description: 'Provider ID' })
  @ApiResponse({ status: 200, description: 'List of badges' })
  async getProviderBadges(
    @Param('providerId') providerId: string,
  ): Promise<BadgeResponse[]> {
    return this.badgeService.getBadgesByProviderId(providerId);
  }

  /**
   * Revoke a badge
   */
  @Delete(':id')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Revoke a credential badge' })
  @ApiParam({ name: 'id', description: 'Badge UUID' })
  @ApiResponse({ status: 200, description: 'Badge revoked' })
  @ApiResponse({ status: 404, description: 'Badge not found' })
  async revokeBadge(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.badgeService.revokeBadge(id);
    return { success: true };
  }
}

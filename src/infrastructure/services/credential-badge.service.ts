import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { randomUUID } from 'crypto';
import * as QRCode from 'qrcode';
import { ConfigService } from '@nestjs/config';
import { CredentialBadgeEntity } from '../persistence/entities/credential-badge.entity';
import { VerificationLogEntity } from '../persistence/entities/verification-log.entity';

/**
 * Badge Response DTO
 */
export interface BadgeResponse {
  id: string;
  shortCode: string;
  providerName: string;
  countryCode: string;
  licenseNumber: string;
  specialty?: string;
  status: string;
  issuedAt: string;
  expiresAt: string;
  verificationUrl: string;
  qrCodeDataUrl?: string;
  isValid: boolean;
  daysUntilExpiration: number;
}

/**
 * Credential Badge Service
 *
 * Manages digital credential badges for verified providers.
 * Features:
 * - Generate QR codes for instant verification
 * - Short codes for easy sharing (8 characters)
 * - Public verification endpoint
 * - Automatic expiration tracking
 */
@Injectable()
export class CredentialBadgeService {
  private readonly logger = new Logger(CredentialBadgeService.name);
  private readonly baseUrl: string;

  constructor(
    @InjectRepository(CredentialBadgeEntity)
    private readonly badgeRepo: Repository<CredentialBadgeEntity>,
    @InjectRepository(VerificationLogEntity)
    private readonly verificationRepo: Repository<VerificationLogEntity>,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('BASE_URL') || 'http://localhost:3000';
  }

  /**
   * Generate a short code (8 alphanumeric characters)
   */
  private generateShortCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed I, O, 0, 1 to avoid confusion
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Create a credential badge for a verified provider
   */
  async createBadge(
    verificationId: string,
    providerName: string,
    specialty?: string,
  ): Promise<BadgeResponse> {
    // Find the verification
    const verification = await this.verificationRepo.findOne({
      where: { id: verificationId },
    });

    if (!verification) {
      throw new NotFoundException(`Verification ${verificationId} not found`);
    }

    if (verification.status !== 'VERIFIED') {
      throw new Error(
        `Cannot create badge for non-verified provider (status: ${verification.status})`,
      );
    }

    const id = randomUUID();
    const shortCode = this.generateShortCode();
    const verificationUrl = `${this.baseUrl}/badge/verify/${shortCode}`;

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    // Create badge entity
    const badge = new CredentialBadgeEntity();
    badge.id = id;
    badge.providerId = verification.providerId;
    badge.verificationId = verificationId;
    badge.providerName = providerName;
    badge.countryCode = verification.countryCode;
    badge.licenseNumber =
      (verification.attributes?.licenseNumber as string) || '';
    badge.specialty =
      specialty || (verification.attributes?.specialty as string);
    badge.status = 'ACTIVE';
    badge.issuedAt = new Date();
    badge.expiresAt =
      verification.expiresAt ||
      new Date(Date.now() + 120 * 24 * 60 * 60 * 1000);
    badge.qrCodeDataUrl = qrCodeDataUrl;
    badge.shortCode = shortCode;
    badge.verificationCount = 0;

    await this.badgeRepo.save(badge);

    this.logger.log(
      `[Badge] Created badge ${shortCode} for provider ${verification.providerId}`,
    );

    return this.toBadgeResponse(badge);
  }

  /**
   * Verify a badge by short code (public endpoint)
   */
  async verifyByShortCode(shortCode: string): Promise<BadgeResponse> {
    const badge = await this.badgeRepo.findOne({
      where: { shortCode: shortCode.toUpperCase() },
    });

    if (!badge) {
      throw new NotFoundException(`Badge ${shortCode} not found`);
    }

    // Update verification stats
    badge.lastVerifiedAt = new Date();
    badge.verificationCount += 1;
    await this.badgeRepo.save(badge);

    return this.toBadgeResponse(badge);
  }

  /**
   * Get badge by ID
   */
  async getBadgeById(id: string): Promise<BadgeResponse> {
    const badge = await this.badgeRepo.findOne({ where: { id } });
    if (!badge) {
      throw new NotFoundException(`Badge ${id} not found`);
    }
    return this.toBadgeResponse(badge);
  }

  /**
   * Get all badges for a provider
   */
  async getBadgesByProviderId(providerId: string): Promise<BadgeResponse[]> {
    const badges = await this.badgeRepo.find({
      where: { providerId },
      order: { createdAt: 'DESC' },
    });
    return badges.map((b) => this.toBadgeResponse(b));
  }

  /**
   * Revoke a badge
   */
  async revokeBadge(id: string, reason?: string): Promise<void> {
    const badge = await this.badgeRepo.findOne({ where: { id } });
    if (!badge) {
      throw new NotFoundException(`Badge ${id} not found`);
    }
    badge.status = 'REVOKED';
    await this.badgeRepo.save(badge);
    this.logger.warn(
      `[Badge] Revoked badge ${badge.shortCode}: ${reason || 'No reason provided'}`,
    );
  }

  /**
   * Find expired badges and update their status
   */
  async updateExpiredBadges(): Promise<number> {
    const result = await this.badgeRepo.update(
      {
        status: 'ACTIVE',
        expiresAt: LessThan(new Date()),
      },
      { status: 'EXPIRED' },
    );
    return result.affected || 0;
  }

  /**
   * Convert entity to response DTO
   */
  private toBadgeResponse(badge: CredentialBadgeEntity): BadgeResponse {
    return {
      id: badge.id,
      shortCode: badge.shortCode,
      providerName: badge.providerName,
      countryCode: badge.countryCode,
      licenseNumber: badge.licenseNumber,
      specialty: badge.specialty,
      status: badge.status,
      issuedAt: badge.issuedAt.toISOString(),
      expiresAt: badge.expiresAt.toISOString(),
      verificationUrl: badge.getVerificationUrl(this.baseUrl),
      qrCodeDataUrl: badge.qrCodeDataUrl,
      isValid: badge.isValid(),
      daysUntilExpiration: badge.getDaysUntilExpiration(),
    };
  }
}

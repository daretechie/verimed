import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Credential Badge Entity
 *
 * Represents a portable, verifiable credential for healthcare providers.
 * Can be shared via QR code for instant verification.
 */
@Entity('credential_badges')
export class CredentialBadgeEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column()
  @Index()
  providerId!: string;

  @Column()
  @Index()
  verificationId!: string;

  @Column()
  providerName!: string;

  @Column()
  countryCode!: string;

  @Column({ nullable: true })
  licenseNumber!: string;

  @Column({ nullable: true })
  specialty!: string;

  @Column({
    type: 'varchar',
    default: 'ACTIVE',
  })
  @Index()
  status!: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'SUSPENDED';

  @Column()
  issuedAt!: Date;

  @Column()
  @Index()
  expiresAt!: Date;

  @Column({ type: 'text', nullable: true })
  qrCodeDataUrl!: string;

  @Column({ type: 'varchar', length: 64 })
  @Index({ unique: true })
  shortCode!: string; // 8-char unique code for easy sharing

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ nullable: true })
  lastVerifiedAt!: Date;

  @Column({ default: 0 })
  verificationCount!: number;

  /**
   * Check if the badge is still valid
   */
  isValid(): boolean {
    return this.status === 'ACTIVE' && new Date() < this.expiresAt;
  }

  /**
   * Get public verification URL
   */
  getVerificationUrl(baseUrl: string): string {
    return `${baseUrl}/badge/verify/${this.shortCode}`;
  }

  /**
   * Get days until expiration
   */
  getDaysUntilExpiration(): number {
    const now = new Date();
    const diff = this.expiresAt.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * NCQA 2025 Compliance: 120-day verification window
 * PSV (Primary Source Verification) must be completed within 120 days
 * for accreditation and 90 days for certification.
 */
const VERIFICATION_WINDOW_DAYS = 120;

@Entity('verification_logs')
export class VerificationLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  providerId: string;

  @Column()
  @Index()
  countryCode: string;

  @Column()
  status: string; // VERIFIED, REJECTED, PENDING, MANUAL_REVIEW

  @Column()
  method: string; // API_REGISTRY, AI_DOCUMENT

  @Column('float')
  confidenceScore: number;

  @Column('simple-json', { nullable: true })
  attributes: Record<string, unknown>;

  @Column('simple-json', { nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  @Index()
  timestamp: Date;

  /**
   * Verification expiration date (120 days from verification)
   * NCQA 2025 requires re-verification after this window
   */
  @Column({ type: 'timestamp', nullable: true })
  @Index()
  expiresAt: Date | null;

  /**
   * Source of verification for audit purposes
   * PRIMARY_SOURCE = Official government API
   * DOCUMENT_AI = AI document verification
   * THIRD_PARTY = Delegated verification (not currently used)
   */
  @Column({ default: 'PRIMARY_SOURCE' })
  verificationSource: string;

  /**
   * Check if this verification has expired (past 120-day window)
   */
  isExpired(): boolean {
    if (!this.expiresAt) {
      // Calculate from timestamp if expiresAt not set
      const expirationDate = new Date(this.timestamp);
      expirationDate.setDate(
        expirationDate.getDate() + VERIFICATION_WINDOW_DAYS,
      );
      return new Date() > expirationDate;
    }
    return new Date() > this.expiresAt;
  }

  /**
   * Get days remaining until expiration
   */
  getDaysUntilExpiration(): number {
    const expirationDate =
      this.expiresAt ||
      new Date(
        this.timestamp.getTime() +
          VERIFICATION_WINDOW_DAYS * 24 * 60 * 60 * 1000,
      );
    const now = new Date();
    const diffTime = expirationDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Static helper to calculate expiration date
   */
  static calculateExpirationDate(verificationDate: Date = new Date()): Date {
    const expirationDate = new Date(verificationDate);
    expirationDate.setDate(expirationDate.getDate() + VERIFICATION_WINDOW_DAYS);
    return expirationDate;
  }
}

/**
 * Export the verification window constant for use elsewhere
 */
export const VERIFICATION_WINDOW = VERIFICATION_WINDOW_DAYS;

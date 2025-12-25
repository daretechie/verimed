import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerificationLogEntity } from '../persistence/entities/verification-log.entity';

/**
 * ManualReviewService manages the Human-in-the-Loop queue for verification cases
 * that require human oversight before final decision.
 *
 * This is critical for:
 * - EU AI Act compliance (high-risk AI decisions require human oversight)
 * - HIPAA compliance (sensitive medical credential verification)
 * - Quality assurance (edge cases and low-confidence results)
 */
@Injectable()
export class ManualReviewService {
  private readonly logger = new Logger(ManualReviewService.name);

  constructor(
    @InjectRepository(VerificationLogEntity)
    private readonly logRepo: Repository<VerificationLogEntity>,
  ) {}

  /**
   * Get all verification requests pending manual review.
   * Ordered by timestamp (oldest first) for FIFO processing.
   */
  async getPendingReviews(): Promise<VerificationLogEntity[]> {
    return this.logRepo.find({
      where: { status: 'MANUAL_REVIEW' },
      order: { timestamp: 'ASC' },
    });
  }

  /**
   * Get count of pending reviews for dashboard/monitoring.
   */
  async getPendingCount(): Promise<number> {
    return this.logRepo.count({
      where: { status: 'MANUAL_REVIEW' },
    });
  }

  /**
   * Approve a manual review case - marks as VERIFIED.
   * @param logId The verification log ID
   * @param reviewerId ID of the human reviewer (for audit trail)
   * @param notes Optional reviewer notes
   */
  async approveReview(
    logId: string,
    reviewerId: string,
    notes?: string,
  ): Promise<VerificationLogEntity> {
    const log = await this.logRepo.findOneOrFail({ where: { id: logId } });

    log.status = 'VERIFIED';
    log.metadata = {
      ...log.metadata,
      humanReview: {
        action: 'APPROVED',
        reviewerId,
        reviewedAt: new Date().toISOString(),
        notes,
      },
    };

    this.logger.log(`[HITL] Review APPROVED: ${logId} by ${reviewerId}`);
    return this.logRepo.save(log);
  }

  /**
   * Reject a manual review case - marks as REJECTED.
   * @param logId The verification log ID
   * @param reviewerId ID of the human reviewer
   * @param reason Mandatory rejection reason
   */
  async rejectReview(
    logId: string,
    reviewerId: string,
    reason: string,
  ): Promise<VerificationLogEntity> {
    const log = await this.logRepo.findOneOrFail({ where: { id: logId } });

    log.status = 'REJECTED';
    log.metadata = {
      ...log.metadata,
      humanReview: {
        action: 'REJECTED',
        reviewerId,
        reviewedAt: new Date().toISOString(),
        reason,
      },
    };

    this.logger.warn(
      `[HITL] Review REJECTED: ${logId} by ${reviewerId} - ${reason}`,
    );
    return this.logRepo.save(log);
  }

  /**
   * Escalate a review to a senior verifier.
   */
  async escalateReview(
    logId: string,
    reviewerId: string,
    escalationReason: string,
  ): Promise<VerificationLogEntity> {
    const log = await this.logRepo.findOneOrFail({ where: { id: logId } });

    log.metadata = {
      ...log.metadata,
      escalation: {
        escalatedBy: reviewerId,
        escalatedAt: new Date().toISOString(),
        reason: escalationReason,
      },
    };

    this.logger.warn(`[HITL] Review ESCALATED: ${logId} by ${reviewerId}`);
    return this.logRepo.save(log);
  }
}

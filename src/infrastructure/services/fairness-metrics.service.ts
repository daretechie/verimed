import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { VerificationLogEntity } from '../persistence/entities/verification-log.entity';

/**
 * Fairness Metrics Service
 *
 * Monitors verification outcomes for potential bias patterns.
 * Tracks name-matching results to ensure fairness across different name types.
 */
@Injectable()
export class FairnessMetricsService {
  private readonly logger = new Logger(FairnessMetricsService.name);

  constructor(
    @InjectRepository(VerificationLogEntity)
    private readonly logRepo: Repository<VerificationLogEntity>,
  ) {}

  /**
   * Analyze verification outcomes for potential bias.
   * Returns aggregate metrics by result status.
   */
  async getOutcomeDistribution(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    total: number;
    verified: number;
    rejected: number;
    manualReview: number;
    pending: number;
    verificationRate: number;
    manualReviewRate: number;
  }> {
    const logs = await this.logRepo.find({
      where: {
        timestamp: Between(startDate, endDate),
      },
    });

    const total = logs.length;
    const verified = logs.filter((l) => l.status === 'VERIFIED').length;
    const rejected = logs.filter((l) => l.status === 'REJECTED').length;
    const manualReview = logs.filter(
      (l) => l.status === 'MANUAL_REVIEW',
    ).length;
    const pending = logs.filter((l) => l.status === 'PENDING').length;

    return {
      total,
      verified,
      rejected,
      manualReview,
      pending,
      verificationRate: total > 0 ? verified / total : 0,
      manualReviewRate: total > 0 ? manualReview / total : 0,
    };
  }

  /**
   * Analyze confidence score distribution.
   * Low average scores might indicate algorithmic issues.
   */
  async getConfidenceDistribution(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    averageScore: number;
    minScore: number;
    maxScore: number;
    lowConfidenceCount: number; // Score < 0.6
    highConfidenceCount: number; // Score >= 0.85
  }> {
    const logs = await this.logRepo.find({
      where: {
        timestamp: Between(startDate, endDate),
      },
    });

    const scores = logs
      .map((l) => l.confidenceScore)
      .filter((s) => s !== null && s !== undefined);

    if (scores.length === 0) {
      return {
        averageScore: 0,
        minScore: 0,
        maxScore: 0,
        lowConfidenceCount: 0,
        highConfidenceCount: 0,
      };
    }

    const sum = scores.reduce((a, b) => a + b, 0);

    return {
      averageScore: sum / scores.length,
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores),
      lowConfidenceCount: scores.filter((s) => s < 0.6).length,
      highConfidenceCount: scores.filter((s) => s >= 0.85).length,
    };
  }

  /**
   * Generate a fairness report for auditing purposes.
   */
  async generateFairnessReport(days: number = 30): Promise<{
    period: { start: Date; end: Date };
    outcomes: {
      total: number;
      verified: number;
      rejected: number;
      manualReview: number;
      pending: number;
      verificationRate: number;
      manualReviewRate: number;
    };
    confidence: {
      averageScore: number;
      minScore: number;
      maxScore: number;
      lowConfidenceCount: number;
      highConfidenceCount: number;
    };
    alerts: string[];
  }> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const outcomes = await this.getOutcomeDistribution(startDate, endDate);
    const confidence = await this.getConfidenceDistribution(startDate, endDate);

    const alerts: string[] = [];

    // Flag potential issues
    if (outcomes.manualReviewRate > 0.3) {
      alerts.push(
        `High Manual Review Rate (${(outcomes.manualReviewRate * 100).toFixed(1)}%) - may indicate systemic issues`,
      );
    }

    if (confidence.averageScore < 0.7 && outcomes.total > 10) {
      alerts.push(
        `Low Average Confidence Score (${confidence.averageScore.toFixed(2)}) - review name-matching algorithm`,
      );
    }

    if (confidence.lowConfidenceCount > confidence.highConfidenceCount * 2) {
      alerts.push(
        'Disproportionate low-confidence outcomes - potential bias indicator',
      );
    }

    return {
      period: { start: startDate, end: endDate },
      outcomes,
      confidence,
      alerts,
    };
  }
}

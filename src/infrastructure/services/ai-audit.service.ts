import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AIAuditLog } from '../persistence/entities/ai-audit-log.entity';

export interface AIDecisionRecord {
  countryCode: string;
  status: string;
  confidenceScore: number;
  model: string;
  providerId: string;
  isFromCache: boolean;
}

export interface BiasReport {
  period: { start: Date; end: Date };
  totalDecisions: number;
  byCountry: Record<
    string,
    { approved: number; rejected: number; manualReview: number }
  >;
  averageConfidenceByCountry: Record<string, number>;
  modelUsage: Record<string, number>;
}

@Injectable()
export class AIAuditService {
  private readonly logger = new Logger(AIAuditService.name);

  constructor(
    @InjectRepository(AIAuditLog)
    private readonly auditRepo: Repository<AIAuditLog>,
  ) {}

  /**
   * Log an AI decision for bias monitoring
   */
  async logDecision(record: AIDecisionRecord): Promise<void> {
    const log = this.auditRepo.create({
      countryCode: record.countryCode,
      status: record.status,
      confidenceScore: record.confidenceScore,
      model: record.model,
      providerId: record.providerId,
      isFromCache: record.isFromCache,
      timestamp: new Date(),
    });

    await this.auditRepo.save(log);
    this.logger.debug(
      `[AI Audit] Logged decision for ${record.providerId}: ${record.status} (${record.countryCode})`,
    );
  }

  /**
   * Generate a bias report for a given time period
   */
  async generateBiasReport(
    startDate: Date,
    endDate: Date,
  ): Promise<BiasReport> {
    const logs = await this.auditRepo.find({
      where: {
        timestamp: Between(startDate, endDate),
      },
    });

    const report: BiasReport = {
      period: { start: startDate, end: endDate },
      totalDecisions: logs.length,
      byCountry: {},
      averageConfidenceByCountry: {},
      modelUsage: {},
    };

    const confidenceSum: Record<string, { sum: number; count: number }> = {};

    for (const log of logs) {
      // Country breakdown
      if (!report.byCountry[log.countryCode]) {
        report.byCountry[log.countryCode] = {
          approved: 0,
          rejected: 0,
          manualReview: 0,
        };
        confidenceSum[log.countryCode] = { sum: 0, count: 0 };
      }

      if (log.status === 'VERIFIED') {
        report.byCountry[log.countryCode].approved++;
      } else if (log.status === 'REJECTED') {
        report.byCountry[log.countryCode].rejected++;
      } else {
        report.byCountry[log.countryCode].manualReview++;
      }

      confidenceSum[log.countryCode].sum += log.confidenceScore;
      confidenceSum[log.countryCode].count++;

      // Model usage
      report.modelUsage[log.model] = (report.modelUsage[log.model] || 0) + 1;
    }

    // Calculate averages
    for (const country of Object.keys(confidenceSum)) {
      report.averageConfidenceByCountry[country] =
        confidenceSum[country].sum / confidenceSum[country].count;
    }

    this.logger.log(
      `[AI Audit] Generated bias report: ${logs.length} decisions`,
    );
    return report;
  }
}

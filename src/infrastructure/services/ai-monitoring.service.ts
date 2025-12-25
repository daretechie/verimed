import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AIUsageStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  costEstimate: number;
}

export class BudgetExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BudgetExceededError';
  }
}

interface CostConfig {
  promptPer1k: number;
  completionPer1k: number;
}

@Injectable()
export class AIMonitoringService {
  private readonly logger = new Logger(AIMonitoringService.name);
  private dailyBudget: number;
  private isKillSwitchActive: boolean;

  constructor(private configService: ConfigService) {
    this.dailyBudget = parseFloat(
      this.configService.get<string>('AI_DAILY_BUDGET', '5.00'),
    );
    this.isKillSwitchActive =
      this.configService.get<string>('AI_KILL_SWITCH') === 'true';
  }

  // Model pricing (updated Dec 2024)
  private readonly MODEL_COSTS: Record<string, CostConfig> = {
    'gpt-4o': { promptPer1k: 0.0025, completionPer1k: 0.01 },
    'gpt-4o-2024-08-06': { promptPer1k: 0.0025, completionPer1k: 0.01 },
    'gpt-4o-mini': { promptPer1k: 0.00015, completionPer1k: 0.0006 },
    'gpt-4o-mini-2024-07-18': { promptPer1k: 0.00015, completionPer1k: 0.0006 },
  };

  private readonly DEFAULT_COST: CostConfig = {
    promptPer1k: 0.003,
    completionPer1k: 0.015,
  };

  // Accumulated stats for reporting
  private sessionStats = {
    totalCalls: 0,
    totalTokens: 0,
    totalCost: 0,
    byModel: {} as Record<
      string,
      { calls: number; tokens: number; cost: number }
    >,
  };

  /**
   * Check if the operation is allowed based on budget and kill switch.
   * Throws BudgetExceededError or Error if not allowed.
   */
  checkBudget(estimatedCost: number = 0): void {
    if (this.isKillSwitchActive) {
      throw new Error('AI Agent Kill Switch is ACTIVE. Operation blocked.');
    }

    if (
      this.dailyBudget > 0 &&
      this.sessionStats.totalCost + estimatedCost > this.dailyBudget
    ) {
      const msg = `Daily AI Budget Exceeded. Limit: $${this.dailyBudget.toFixed(2)}, Current: $${this.sessionStats.totalCost.toFixed(2)}`;
      this.logger.warn(msg);
      throw new BudgetExceededError(msg);
    }
  }

  logUsage(stats: AIUsageStats): void {
    const cost = this.calculateCost(stats);

    // Update session stats
    this.sessionStats.totalCalls++;
    this.sessionStats.totalTokens += stats.totalTokens;
    this.sessionStats.totalCost += cost;

    if (!this.sessionStats.byModel[stats.model]) {
      this.sessionStats.byModel[stats.model] = { calls: 0, tokens: 0, cost: 0 };
    }
    this.sessionStats.byModel[stats.model].calls++;
    this.sessionStats.byModel[stats.model].tokens += stats.totalTokens;
    this.sessionStats.byModel[stats.model].cost += cost;

    this.logger.log(
      `[AI Usage] Model: ${stats.model} | Prompt: ${stats.promptTokens} | Completion: ${stats.completionTokens} | Total: ${stats.totalTokens} | Cost: $${cost.toFixed(6)}`,
    );
  }

  private calculateCost(stats: AIUsageStats): number {
    const modelKey = Object.keys(this.MODEL_COSTS).find((key) =>
      stats.model.includes(key),
    );
    const costs = modelKey ? this.MODEL_COSTS[modelKey] : this.DEFAULT_COST;

    return (
      (stats.promptTokens / 1000) * costs.promptPer1k +
      (stats.completionTokens / 1000) * costs.completionPer1k
    );
  }

  /**
   * Get accumulated session statistics
   */
  getSessionStats(): typeof this.sessionStats {
    return { ...this.sessionStats };
  }

  /**
   * Reset session statistics
   */
  resetSessionStats(): void {
    this.sessionStats = {
      totalCalls: 0,
      totalTokens: 0,
      totalCost: 0,
      byModel: {},
    };
    this.logger.log('[AI Monitoring] Session stats reset');
  }

  /**
   * Log a summary of session statistics
   */
  logSessionSummary(): void {
    const stats = this.sessionStats;
    this.logger.log('=== AI Usage Session Summary ===');
    this.logger.log(`Total API Calls: ${stats.totalCalls}`);
    this.logger.log(`Total Tokens: ${stats.totalTokens}`);
    this.logger.log(`Total Estimated Cost: $${stats.totalCost.toFixed(4)}`);

    for (const [model, modelStats] of Object.entries(stats.byModel)) {
      this.logger.log(
        `  ${model}: ${modelStats.calls} calls, ${modelStats.tokens} tokens, $${modelStats.cost.toFixed(4)}`,
      );
    }
    this.logger.log('================================');
  }
}

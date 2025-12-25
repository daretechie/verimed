import { Controller, Get, Logger } from '@nestjs/common';
import { AICacheService } from '../services/ai-cache.service';
import { AIMonitoringService } from '../services/ai-monitoring.service';

@Controller('api/v1/ai')
export class AIController {
  private readonly logger = new Logger(AIController.name);

  constructor(
    private readonly cacheService: AICacheService,
    private readonly monitoringService: AIMonitoringService,
  ) {}

  /**
   * Get AI system health and statistics
   */
  @Get('health')
  async getHealth(): Promise<{
    cache: {
      type: 'redis' | 'memory';
      size: number;
      maxSize: number | 'unlimited';
      ttlSeconds: number;
    };
    session: {
      totalCalls: number;
      totalTokens: number;
      totalCost: number;
      byModel: Record<string, { calls: number; tokens: number; cost: number }>;
    };
  }> {
    const cacheStats = await this.cacheService.getStats();
    const sessionStats = this.monitoringService.getSessionStats();

    return {
      cache: cacheStats,
      session: sessionStats,
    };
  }

  /**
   * Clear AI cache
   */
  @Get('cache/clear')
  async clearCache(): Promise<{ message: string }> {
    await this.cacheService.clear();
    this.logger.log('[AI Controller] Cache cleared');
    return { message: 'AI cache cleared successfully' };
  }

  /**
   * Reset session statistics
   */
  @Get('stats/reset')
  resetStats(): { message: string } {
    this.monitoringService.resetSessionStats();
    this.logger.log('[AI Controller] Session stats reset');
    return { message: 'Session statistics reset successfully' };
  }
}

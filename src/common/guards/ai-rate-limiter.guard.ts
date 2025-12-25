import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { ExecutionContext } from '@nestjs/common';

/**
 * AI Tool Rate Limiter
 *
 * Extended throttling specifically for AI tool calls.
 * Provides stricter limits for expensive AI operations.
 */
@Injectable()
export class AIToolRateLimiter extends ThrottlerGuard {
  private readonly logger = new Logger(AIToolRateLimiter.name);

  /**
   * AI-specific rate limits (stricter than global)
   */
  private readonly aiLimits = {
    ttl: 60000, // 1 minute window
    limit: 5, // Max 5 AI calls per minute per client
  };

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Track by API key or IP
    const apiKey = req.headers?.['x-api-key'];
    const ip = req.ip || req.connection?.remoteAddress;
    return `ai-tool:${apiKey || ip}`;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tracker = await this.getTracker(request);

    // Use the AI-specific limits instead of global
    try {
      const result = await super.canActivate(context);
      this.logger.debug(`[AI RATE LIMIT] ${tracker} - Allowed`);
      return result;
    } catch (error) {
      if (error instanceof ThrottlerException) {
        this.logger.warn(
          `[AI RATE LIMIT] ${tracker} - BLOCKED (rate limit exceeded)`,
        );
      }
      throw error;
    }
  }
}

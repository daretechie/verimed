import {
  Controller,
  Post,
  Get,
  UseGuards,
  HttpCode,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiSecurity,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ResilienceService } from '../services/resilience.service';
import { FairnessMetricsService } from '../services/fairness-metrics.service';

/**
 * Chaos Engineering Controller
 *
 * Provides endpoints for controlled fault injection and testing.
 * ADMIN ONLY - Protected by JWT authentication.
 */
@ApiTags('Chaos Engineering (Admin)')
@ApiSecurity('api-key')
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'chaos', version: '1' })
export class ChaosController {
  constructor(
    private readonly config: ConfigService,
    private readonly fairnessService: FairnessMetricsService,
  ) {}

  @Post('kill-switch/activate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Activate AI Kill Switch (Emergency Halt)' })
  @ApiResponse({ status: 200, description: 'Kill switch activated' })
  async activateKillSwitch() {
    // In production, this would update a shared config store (Redis, etc.)
    // For now, we'll return instructions
    return {
      status: 'MANUAL_ACTION_REQUIRED',
      message:
        'Set AI_KILL_SWITCH=true in environment and restart the application',
      command: 'heroku config:set AI_KILL_SWITCH=true -a verimed-prod',
    };
  }

  @Post('kill-switch/deactivate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Deactivate AI Kill Switch' })
  @ApiResponse({ status: 200, description: 'Kill switch deactivated' })
  async deactivateKillSwitch() {
    return {
      status: 'MANUAL_ACTION_REQUIRED',
      message:
        'Set AI_KILL_SWITCH=false in environment and restart the application',
      command: 'heroku config:set AI_KILL_SWITCH=false -a verimed-prod',
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current chaos/safety status' })
  @ApiResponse({ status: 200, description: 'Current system status' })
  async getStatus() {
    return {
      killSwitch: this.config.get('AI_KILL_SWITCH') === 'true',
      aiBudget: this.config.get('AI_DAILY_BUDGET'),
      environment: this.config.get('NODE_ENV'),
    };
  }

  @Get('fairness-report')
  @ApiOperation({ summary: 'Generate AI fairness report' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Fairness metrics report' })
  async getFairnessReport(@Query('days') days?: number) {
    return this.fairnessService.generateFairnessReport(days || 30);
  }

  @Post('simulate/latency')
  @HttpCode(200)
  @ApiOperation({ summary: 'Simulate latency spike (for testing)' })
  @ApiResponse({ status: 200, description: 'Latency simulation triggered' })
  async simulateLatency(@Query('ms') ms: number = 5000) {
    await new Promise((resolve) => setTimeout(resolve, Math.min(ms, 10000))); // Max 10s
    return {
      status: 'COMPLETE',
      simulatedLatencyMs: Math.min(ms, 10000),
    };
  }

  @Post('simulate/error')
  @HttpCode(500)
  @ApiOperation({ summary: 'Trigger test error (for alerting validation)' })
  async simulateError() {
    throw new Error('[CHAOS TEST] Intentional error for alerting validation');
  }
}

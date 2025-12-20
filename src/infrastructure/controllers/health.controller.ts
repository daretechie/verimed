import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  HealthCheck,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private config: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Deep health check (DB + Config)' })
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => ({
        ai_config: {
          status: this.config.get('AI_API_KEY') ? 'up' : 'down',
          message: this.config.get('AI_API_KEY')
            ? 'Configured'
            : 'Missing AI_API_KEY',
        },
      }),
    ]);
  }
}

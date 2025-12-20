import { Controller, Get, Redirect } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

@Controller()
export class RootController {
  @Get()
  @SkipThrottle()
  @Redirect('/api', 301)
  @ApiExcludeEndpoint() // Hides this endpoint from Swagger UI itself
  redirectToSwagger() {}
}

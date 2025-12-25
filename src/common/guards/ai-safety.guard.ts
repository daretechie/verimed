import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  Logger,
} from '@nestjs/common';

@Injectable()
export class AISafetyGuard implements CanActivate {
  private readonly logger = new Logger(AISafetyGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // We only care about attributes that might be injected into prompts
    const attributes = request.body?.attributes;

    if (attributes) {
      this.validateAttributes(attributes);
    }

    return true;
  }

  private validateAttributes(attributes: Record<string, any>): void {
    const serialized = JSON.stringify(attributes);

    // Check for common injection patterns
    const injectionPatterns = [
      /ignore previous instructions/i,
      /system prompt/i,
      /instead of doing/i,
      /you are now/i,
      /new rules/i,
      /administrative access/i,
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(serialized)) {
        this.logger.warn(
          `Potential AI prompt injection detected: ${serialized}`,
        );
        throw new BadRequestException(
          'Security violation: Invalid input characters detected.',
        );
      }
    }

    // Strict character validation to prevent JSON breaking
    // We allow letters, numbers, and basic punctuation, but block control characters and nested object symbols if not expected
    const forbiddenPatterns = [
      /[{}[\]]/, // Blocking brackets/braces in values to prevent structure manipulation
    ];

    for (const [key, value] of Object.entries(attributes)) {
      if (typeof value === 'string') {
        for (const pattern of forbiddenPatterns) {
          if (pattern.test(value)) {
            this.logger.warn(
              `Forbidden characters in AI input attribute ${key}: ${value}`,
            );
            throw new BadRequestException(
              `Security violation: Invalid characters in field ${key}.`,
            );
          }
        }
      }
    }
  }
}

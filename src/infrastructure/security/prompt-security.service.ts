import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PromptSecurityService {
  private readonly logger = new Logger(PromptSecurityService.name);

  // Known injection/jailbreak patterns (Layer 1 defense)
  private readonly INJECTION_PATTERNS = [
    /ignore previous instructions/i,
    /system override/i,
    /developer mode/i,
    /dan mode/i,
    /unrestricted mode/i,
    /jailbreak/i,
    /removes all ethical constraints/i,
    /act as a/i,
  ];

  /**
   * Detects if the input string contains known prompt injection patterns.
   * @param input User input string
   * @returns true if injection detected
   */
  detectInjection(input: string): boolean {
    if (!input) return false;

    // Check against regex patterns
    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        this.logger.warn(
          `Prompt Injection Attempt Detected: Matches pattern ${pattern}`,
        );
        return true;
      }
    }
    return false;
  }

  /**
   * Sanitizes input to remove potential control characters or markup that might confuse the LLM.
   * Simple implementation: escapes XML/HTML-like tags if we are using XML delimiters.
   * @param input Raw input
   */
  sanitizeInput(input: string): string {
    if (!input) return '';
    // Replace < and > to prevent users from closing our internal XML tags
    return input.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

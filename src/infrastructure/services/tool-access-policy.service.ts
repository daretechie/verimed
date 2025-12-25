import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Tool Access Policy Service
 *
 * Implements allowlisting for tools/APIs that AI agents can access.
 * This is a security control to prevent unauthorized external calls.
 */
@Injectable()
export class ToolAccessPolicyService {
  private readonly logger = new Logger(ToolAccessPolicyService.name);

  /**
   * Allowlist of external services the AI agent can access.
   * Each entry is a URL pattern that is permitted.
   */
  private readonly allowedServices: string[] = [
    // Government Registries
    'https://npiregistry.cms.hhs.gov/*', // US NPI
    'https://gateway.api.esante.gouv.fr/*', // France ANS
    'https://services.big-register.nl/*', // Netherlands BIG
    'https://data.gov.il/*', // Israel MOH
    'https://dubaihealth.ae/*', // UAE DHA

    // AI Providers (when AI_API_KEY is set)
    'https://api.openai.com/*',

    // Internal Services
    'http://localhost:*',
    'https://localhost:*',
  ];

  /**
   * Blocked services (explicit deny list for known dangerous endpoints)
   */
  private readonly blockedServices: string[] = [
    'http://169.254.169.254/*', // AWS Metadata SSRF
    'http://metadata.google.internal/*', // GCP Metadata SSRF
    'file://*', // Prevent file:// protocol
  ];

  constructor(private readonly config: ConfigService) {
    this.logger.log(
      `Tool Access Policy initialized with ${this.allowedServices.length} allowed services`,
    );
  }

  /**
   * Check if a URL is allowed to be accessed by the AI agent.
   * @throws ForbiddenException if URL is blocked
   */
  validateAccess(url: string): boolean {
    // Check explicit blocklist first
    for (const pattern of this.blockedServices) {
      if (this.matchPattern(url, pattern)) {
        this.logger.error(`[TOOL ACCESS] BLOCKED: ${url} (matches blocklist)`);
        throw new ForbiddenException(
          `Access to ${url} is blocked by security policy`,
        );
      }
    }

    // Check allowlist
    for (const pattern of this.allowedServices) {
      if (this.matchPattern(url, pattern)) {
        this.logger.debug(`[TOOL ACCESS] Allowed: ${url}`);
        return true;
      }
    }

    // Default deny
    this.logger.warn(`[TOOL ACCESS] DENIED: ${url} (not in allowlist)`);
    throw new ForbiddenException(
      `Access to ${url} is not permitted by security policy`,
    );
  }

  /**
   * Simple wildcard pattern matching
   */
  private matchPattern(url: string, pattern: string): boolean {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
    );
    return regex.test(url);
  }

  /**
   * Get list of allowed services for transparency/auditing
   */
  getAllowedServices(): string[] {
    return [...this.allowedServices];
  }
}

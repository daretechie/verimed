import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LicenseService {
  private readonly logger = new Logger(LicenseService.name);
  private readonly licenseKey: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.licenseKey = this.config.get<string>('LICENSE_KEY');
  }

  /**
   * Check if the instance has a valid enterprise license.
   * For the scaffold, we just check if the key exists and has a specific prefix/format.
   * In production, this would call a licensing API or verify a JWT signature.
   */
  isValid(): boolean {
    if (!this.licenseKey) {
      return false;
    }
    // Simple check: Enterprise keys start with 'ENT-'
    return this.licenseKey.startsWith('ENT-');
  }

  getPlan(): 'COMMUNITY' | 'ENTERPRISE' {
    return this.isValid() ? 'ENTERPRISE' : 'COMMUNITY';
  }
}

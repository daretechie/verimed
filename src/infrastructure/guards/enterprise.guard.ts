import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { LicenseService } from '../licensing/license.service';

@Injectable()
export class EnterpriseGuard implements CanActivate {
  constructor(private readonly licenseService: LicenseService) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canActivate(_context: ExecutionContext): boolean {
    if (!this.licenseService.isValid()) {
      throw new ForbiddenException(
        'This feature requires a VeriMed Enterprise License. Please upgrade to access.',
      );
    }
    return true;
  }
}

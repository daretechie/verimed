import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { ICryptoService } from '../../domain/ports/crypto-service.port';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject('CryptoService') private readonly cryptoService: ICryptoService,
  ) {}

  onModuleInit() {
    const adminUser = this.configService.get<string>('ADMIN_USER');
    const adminPassHash = this.configService.get<string>('ADMIN_PASS');

    if (!adminUser || !adminPassHash) {
      this.logger.warn(
        '⚠️  ADMIN_USER or ADMIN_PASS is not set. Admin authentication will be DISABLED.',
      );
    }
  }

  async adminLogin(user: string, pass: string): Promise<any> {
    const adminUser = this.configService.get<string>('ADMIN_USER');
    const adminPassHash = this.configService.get<string>('ADMIN_PASS');

    if (!adminUser || !adminPassHash) {
      return null;
    }

    const isMatch =
      user === adminUser &&
      (await this.cryptoService.compare(pass, adminPassHash));

    if (isMatch) {
      const payload = { username: user, sub: 'admin' };
      return {
        access_token: this.jwtService.sign(payload),
      };
    }
    return null;
  }
}

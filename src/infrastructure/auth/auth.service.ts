import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async adminLogin(user: string, pass: string): Promise<any> {
    const adminUser = this.configService.get<string>('ADMIN_USER');
    const adminPassHash = this.configService.get<string>('ADMIN_PASS');

    if (!adminUser || !adminPassHash) {
      return null;
    }

    const isMatch =
      user === adminUser && (await bcrypt.compare(pass, adminPassHash));

    if (isMatch) {
      const payload = { username: user, sub: 'admin' };
      return {
        access_token: this.jwtService.sign(payload),
      };
    }
    return null;
  }
}

import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ICryptoService } from '../../domain/ports/crypto-service.port';

@Injectable()
export class BcryptCryptoService implements ICryptoService {
  private readonly SALT_ROUNDS = 10;

  async hash(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, this.SALT_ROUNDS);
  }

  async compare(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }
}

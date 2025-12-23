/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let mockJwtService: Partial<JwtService>;
  const hashedPassword = bcrypt.hashSync('admin-pass-123', 10);

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'ADMIN_USER') return 'admin';
      if (key === 'ADMIN_PASS') return hashedPassword;
      return undefined;
    }),
  };

  beforeEach(async () => {
    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('adminLogin', () => {
    it('should return access token for valid credentials', async () => {
      const result = await service.adminLogin('admin', 'admin-pass-123');

      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toBe('mock-jwt-token');
    });

    it('should return null for invalid username', async () => {
      const result = await service.adminLogin('wrong', 'admin-pass-123');

      expect(result).toBeNull();
    });

    it('should return null for invalid password', async () => {
      const result = await service.adminLogin('admin', 'wrong-password');

      expect(result).toBeNull();
    });

    it('should return null when ADMIN_USER not configured', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      const result = await service.adminLogin('admin', 'password');

      expect(result).toBeNull();
    });
  });
});

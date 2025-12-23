import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../auth/auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: Partial<AuthService>;

  beforeEach(async () => {
    mockAuthService = {
      adminLogin: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('login', () => {
    it('should return access token for valid credentials', async () => {
      (mockAuthService.adminLogin as jest.Mock).mockResolvedValue({
        access_token: 'mock-token',
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await controller.login({
        user: 'admin',
        pass: 'password',
      });

      expect(result).toEqual({ access_token: 'mock-token' });
      expect(mockAuthService.adminLogin).toHaveBeenCalledWith(
        'admin',
        'password',
      );
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      (mockAuthService.adminLogin as jest.Mock).mockResolvedValue(null);

      await expect(
        controller.login({ user: 'wrong', pass: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { RootController } from './root.controller';

describe('RootController', () => {
  let controller: RootController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RootController],
    }).compile();

    controller = module.get<RootController>(RootController);
  });

  describe('redirectToSwagger', () => {
    it('should be defined', () => {
      // RootController only has a redirect - just verify it exists
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(controller.redirectToSwagger).toBeDefined();
    });

    it('should return undefined (redirect handler)', () => {
      // The redirect decorator handles the redirect, method returns void
      const result = controller.redirectToSwagger();
      expect(result).toBeUndefined();
    });
  });
});

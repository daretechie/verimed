import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Enterprise Features (E2E)', () => {
  let app: INestApplication;

  // 1. Test without License Key (Community Edition)
  describe('Community Edition (No License)', () => {
    beforeEach(async () => {
      // Set required config first
      process.env.API_KEY = 'mock-api-key';
      process.env.JWT_SECRET = 'mock-jwt-secret';
      process.env.ADMIN_PASS = 'mock-admin-pass';

      // Ensure NO license key is present
      delete process.env.LICENSE_KEY;

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();
    });

    afterEach(async () => {
      if (app) {
        await app.close();
      }
    });

    it('/verify/batch (POST) should return 403 Forbidden', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return request(app.getHttpServer())
        .post('/verify/batch')
        .set('x-api-key', 'mock-api-key')
        .send({ providers: [] })
        .expect(403)
        .expect((_res) => {
          // Joi/Nest might return different error structures, but 403 is key
          // The guard throws ForbiddenException
        });
    });
  });

  // 2. Test with Valid License Key (Enterprise Edition)
  describe('Enterprise Edition (Valid License)', () => {
    beforeEach(async () => {
      process.env.API_KEY = 'mock-api-key';
      process.env.JWT_SECRET = 'mock-jwt-secret';
      process.env.ADMIN_PASS = 'mock-admin-pass';

      // Set valid license
      process.env.LICENSE_KEY = 'ENT-TEST-KEY-123';

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();
    });

    afterEach(async () => {
      if (app) {
        await app.close();
      }
    });

    it('/verify/batch (POST) should be allowed (429/400/201)', () => {
      // It might return 400 because body is empty/invalid or 201 if valid
      // But it should NOT return 403
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return request(app.getHttpServer())
        .post('/verify/batch')
        .set('x-api-key', 'mock-api-key')
        .send({
          providers: [
            {
              providerId: 'p1',
              countryCode: 'US',
              firstName: 'Test',
              lastName: 'User',
              licenseNumber: '123',
            },
          ],
        })
        .expect((res) => {
          expect(res.status).not.toBe(403);
          // It might be 201 or 400 depending on deep validation,
          // let's accept anything that isn't Forbidden.
        });
    });
  });
});

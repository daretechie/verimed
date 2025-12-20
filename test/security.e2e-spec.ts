/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unused-vars */
process.env.JWT_SECRET = 'test-jwt-secret-123-abc-789';
process.env.ADMIN_USER = 'admin';
process.env.ADMIN_PASS = '$2b$10$H2E9awk4GsTMSQi8sJnaC.UfPsN9WmBF6Mc43xCrb4Vbl9NB4FJQ2';
process.env.API_KEY = 'verimed-secret';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
const helmet = require('helmet');
const compression = require('compression');

describe('Security QA (E2E)', () => {
  let app: INestApplication;
  const apiKey = process.env.API_KEY || 'verimed-secret';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same middleware as in main.ts
    app.use(helmet());
    app.use(compression());

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Authentication Bypass Attempts', () => {
    it('Should reject /verify (POST) without API Key', async () => {
      await request(app.getHttpServer())
        .post('/verify')
        .send({ providerId: 'test' })
        .expect(401);
    });

    it('Should reject /verify (POST) with invalid API Key', async () => {
      await request(app.getHttpServer())
        .post('/verify')
        .set('x-api-key', 'wrong-key')
        .send({ providerId: 'test' })
        .expect(401);
    });

    it('Should reject /verify/:id/review (PUT) without JWT', async () => {
      await request(app.getHttpServer())
        .put('/verify/any-id/review')
        .set('x-api-key', apiKey)
        .send({ status: 'VERIFIED' })
        .expect(401);
    });

    it('Should reject /verify/:id/review (PUT) with invalid JWT', async () => {
      await request(app.getHttpServer())
        .put('/verify/any-id/review')
        .set('x-api-key', apiKey)
        .set('Authorization', 'Bearer invalid-token')
        .send({ status: 'VERIFIED' })
        .expect(401);
    });
  });

  describe('Security Headers (Helmet Verification)', () => {
    it('Should include Content-Security-Policy', async () => {
      const response = await request(app.getHttpServer()).get('/health');
      expect(response.header).toHaveProperty('content-security-policy');
    });

    it('Should include X-Content-Type-Options: nosniff', async () => {
      const response = await request(app.getHttpServer()).get('/health');
      expect(response.header['x-content-type-options']).toBe('nosniff');
    });

    it('Should include X-Frame-Options: SAMEORIGIN', async () => {
      const response = await request(app.getHttpServer()).get('/health');
      expect(response.header['x-frame-options']).toBe('SAMEORIGIN');
    });

    it('Should NOT include X-Powered-By (Information Leakage)', async () => {
      const response = await request(app.getHttpServer()).get('/health');
      expect(response.header).not.toHaveProperty('x-powered-by');
    });
  });

  describe('Error Handling Privacy', () => {
    it('Should NOT expose stack traces on 500 errors', async () => {
      // We manually trigger an error by sending malformed data to a sensitive endpoint
      // Or we can mock a use-case failure. For simplicity, we check if the response body doesn't contain 'stack'
      const response = await request(app.getHttpServer())
        .get('/verify/invalid-uuid-format')
        .set('x-api-key', apiKey);

      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('trace');
    });
  });

  describe('Rate Limiting (Bruteforce Protection)', () => {
    it('Should eventually return 429 when flooding requests', async () => {
      // The default limit is 10 requests per minute
      // We run them sequentially to avoid ECONNRESET in test environment
      let throttled = false;
      for (let i = 0; i < 15; i++) {
        try {
          const res = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ user: 'admin', pass: 'wrong' });

          if (res.status === 429) {
            throttled = true;
            break;
          }
        } catch (err) {
          // Ignore connection resets, we just need to see one 429
        }
      }
      expect(throttled).toBe(true);
    });
  });
});

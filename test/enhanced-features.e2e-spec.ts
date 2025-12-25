/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
process.env.JWT_SECRET = 'test-jwt-secret-123-abc-789';
process.env.ADMIN_USER = 'admin';
process.env.ADMIN_PASS =
  '$2b$10$H2E9awk4GsTMSQi8sJnaC.UfPsN9WmBF6Mc43xCrb4Vbl9NB4FJQ2';
process.env.API_KEY = 'verimed-secret';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { VerificationStatus } from '../src/domain/enums/verification-status.enum';
const helmet = require('helmet');

interface LoginResponse {
  access_token: string;
}

interface VerificationResponse {
  transactionId: string;
  status: VerificationStatus;
}

describe('VeriMed Enhanced Features (E2E)', () => {
  let app: INestApplication;
  let apiKey: string;
  let jwtToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(helmet());
    await app.init();

    apiKey = process.env.API_KEY || 'verimed-secret';

    // Get JWT Token for Administrative reviews
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        user: 'admin',
        pass: 'admin-pass-123',
      });

    jwtToken = (loginResponse.body as LoginResponse).access_token;
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Global Coverage (New Adapters)', () => {
    it('UK - Should return MANUAL_REVIEW for GMC number', async () => {
      const response = await request(app.getHttpServer())
        .post('/verify')
        .set('x-api-key', apiKey)
        .send({
          providerId: 'e2e-uk-01',
          countryCode: 'GB',
          firstName: 'Alexander',
          lastName: 'Fleming',
          licenseNumber: '1234567', // 7 digits
        })
        .expect(201);

      expect(response.body.status).toBe(VerificationStatus.MANUAL_REVIEW);
      expect(response.body.details.source).toBe('API_REGISTRY');
    });

    it('Canada - Should return MANUAL_REVIEW with province info', async () => {
      const response = await request(app.getHttpServer())
        .post('/verify')
        .set('x-api-key', apiKey)
        .send({
          providerId: 'e2e-ca-01',
          countryCode: 'CA',
          firstName: 'Frederick',
          lastName: 'Banting',
          licenseNumber: 'ON-123456',
        })
        .expect(201);

      expect(response.body.status).toBe(VerificationStatus.MANUAL_REVIEW);
      expect(response.body.details.province).toBe('Ontario');
    });

    it('Australia - Should return MANUAL_REVIEW and detect profession', async () => {
      const response = await request(app.getHttpServer())
        .post('/verify')
        .set('x-api-key', apiKey)
        .send({
          providerId: 'e2e-au-01',
          countryCode: 'AU',
          firstName: 'Howard',
          lastName: 'Florey',
          licenseNumber: 'MED0001234567',
        })
        .expect(201);

      expect(response.body.status).toBe(VerificationStatus.MANUAL_REVIEW);
      expect(response.body.details.detectedProfession).toBe(
        'Medical Practitioner',
      );
    });
  });

  describe('Manual Review Queue (HITL)', () => {
    let pendingTxId: string;

    beforeAll(async () => {
      // Create a pending verification (UK)
      const res = await request(app.getHttpServer())
        .post('/verify')
        .set('x-api-key', apiKey)
        .send({
          providerId: 'e2e-hitl-01',
          countryCode: 'GB',
          firstName: 'Test',
          lastName: 'Review',
          licenseNumber: '7654321',
        });
      pendingTxId = res.body.transactionId;
    });

    it('GET /reviews - Should list pending verifications (JWT)', async () => {
      const response = await request(app.getHttpServer())
        .get('/reviews')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      const item = response.body.find((r: any) => r.id === pendingTxId);
      expect(item).toBeDefined();
    });

    it('POST /reviews/:id/approve - Should approve a verification', async () => {
      await request(app.getHttpServer())
        .post(`/reviews/${pendingTxId}/approve`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(201);

      // Verify status changed
      const res = await request(app.getHttpServer())
        .get(`/verify/${pendingTxId}`)
        .set('x-api-key', apiKey);
      expect(res.body.status).toBe(VerificationStatus.VERIFIED);
    });
  });

  describe('Chaos Experiments', () => {
    it('POST /chaos/kill-switch - Should toggle AI kill switch', async () => {
      // Deactivate
      await request(app.getHttpServer())
        .post('/chaos/kill-switch')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ active: true })
        .expect(201);

      // Check health
      const health = await request(app.getHttpServer()).get('/health');
      expect(health.body.details.ai_safety.status).toBe('down');

      // Re-activate
      await request(app.getHttpServer())
        .post('/chaos/kill-switch')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ active: false })
        .expect(201);
    });

    it('GET /chaos/fairness - Should return fairness report', async () => {
      const response = await request(app.getHttpServer())
        .get('/chaos/fairness')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('reportId');
      expect(response.body).toHaveProperty('summary');
    });
  });

  describe('Rate Limiting (429)', () => {
    it('Should return 429 when throttled', async () => {
      // Throttler is set to 10 reqs / 60s
      // We already made several requests in previous tests

      const fire = () =>
        request(app.getHttpServer())
          .post('/verify')
          .set('x-api-key', apiKey)
          .send({
            providerId: 'throttle-test',
            countryCode: 'US',
            firstName: 'Test',
            lastName: 'Throttle',
            licenseNumber: '1234567890',
          });

      let response;
      for (let i = 0; i < 15; i++) {
        response = await fire();
        if (response.status === 429) break;
      }

      expect(response?.status).toBe(429);
    });
  });
});

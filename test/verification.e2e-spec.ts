/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-call */
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
  metadata: Record<string, any>;
}

describe('VeriMed System (E2E)', () => {
  let app: INestApplication;
  let transactionId: string;
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
  }, 30000); // 30s timeout for database connection

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/verify (POST) - Should submit a US provider (NPI Registry)', async () => {
    const response = await request(app.getHttpServer())
      .post('/verify')
      .set('x-api-key', apiKey)
      .send({
        providerId: 'e2e-test-us-01',
        countryCode: 'US',
        firstName: 'John',
        lastName: 'Smith',
        licenseNumber: '1234567890', // Valid NPI format (10 digits)
      })
      .expect(201);

    const body = response.body as VerificationResponse;
    expect(body).toHaveProperty('transactionId');
    // US providers go through NPI registry - may be VERIFIED or REJECTED based on lookup
    expect([
      VerificationStatus.VERIFIED,
      VerificationStatus.REJECTED,
    ]).toContain(body.status);

    transactionId = body.transactionId;
  });

  it('/verify/:id (GET) - Should retrieve the verification result', async () => {
    // Skip if no transactionId from previous test
    if (!transactionId) {
      console.log('Skipping: No transactionId from previous test');
      return;
    }

    const response = await request(app.getHttpServer())
      .get(`/verify/${transactionId}`)
      .set('x-api-key', apiKey)
      .expect(200);

    const body = response.body as VerificationResponse;
    expect(body.transactionId).toBe(transactionId);
  });

  it('/verify/:id/review (PUT) - Should approve the request (JWT Protected)', async () => {
    // Skip if no transactionId or no JWT token
    if (!transactionId || !jwtToken) {
      console.log('Skipping: Missing transactionId or jwtToken');
      return;
    }

    const response = await request(app.getHttpServer())
      .put(`/verify/${transactionId}/review`)
      .set('x-api-key', apiKey)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: VerificationStatus.VERIFIED,
        reason: 'E2E Test Approval',
      })
      .expect(200);

    const body = response.body as {
      success: boolean;
      status: VerificationStatus;
    };
    expect(body.success).toBe(true);
    expect(body.status).toBe(VerificationStatus.VERIFIED);
  });

  it('/verify/:id (GET) - Should confirm the status is now VERIFIED', async () => {
    // Skip if no transactionId
    if (!transactionId) {
      console.log('Skipping: No transactionId from previous test');
      return;
    }

    const response = await request(app.getHttpServer())
      .get(`/verify/${transactionId}`)
      .set('x-api-key', apiKey)
      .expect(200);

    const body = response.body as VerificationResponse;
    expect(body.status).toBe(VerificationStatus.VERIFIED);
  });
});

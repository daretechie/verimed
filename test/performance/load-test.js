import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // ramp up to 20 users
    { duration: '1m', target: 20 },  // stay at 20 users
    { duration: '10s', target: 0 },  // scale down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must be below 500ms
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key';

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
  };

  // 1. Health Check
  const healthRes = http.get(`${BASE_URL}/health`, params);
  check(healthRes, {
    'health check is 200': (r) => r.status === 200,
  });

  // 2. Simple Verification (Metadata only)
  const payload = JSON.stringify({
    providerId: 'k6-test-' + __VU + '-' + __ITER,
    countryCode: 'US',
    firstName: 'Test',
    lastName: 'User',
    licenseNumber: '12345',
  });

  const verifyRes = http.post(`${BASE_URL}/v1/verify`, payload, params);
  check(verifyRes, {
    'verification is 201': (r) => r.status === 201,
  });

  sleep(1);
}

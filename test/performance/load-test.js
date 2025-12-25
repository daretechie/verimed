import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

/**
 * VeriMed API Performance Test Suite
 * 
 * Run with: k6 run test/performance/load-test.js
 * 
 * Environment Variables:
 *   - BASE_URL: API base URL (default: http://localhost:3000)
 *   - API_KEY: Valid API key for authentication
 */

// Custom metrics
const errorRate = new Rate('errors');
const verifyDuration = new Trend('verify_duration');

// Test configuration
export const options = {
  // Ramp-up pattern
  stages: [
    { duration: '30s', target: 10 },   // Warm up: 10 VUs
    { duration: '1m', target: 50 },    // Ramp to 50 VUs
    { duration: '2m', target: 50 },    // Sustain 50 VUs
    { duration: '30s', target: 100 },  // Spike to 100 VUs
    { duration: '1m', target: 100 },   // Sustain spike
    { duration: '30s', target: 0 },    // Ramp down
  ],
  
  // Thresholds (SLOs)
  thresholds: {
    http_req_duration: ['p(95)<500'],    // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],      // Error rate < 1%
    errors: ['rate<0.05'],               // Custom error rate < 5%
    verify_duration: ['p(99)<2000'],     // 99% of verifications under 2s
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key';

const headers = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY,
};

export default function () {
  
  group('Health Check', () => {
    const healthRes = http.get(`${BASE_URL}/health`);
    check(healthRes, {
      'health status is 200': (r) => r.status === 200,
      'health response time < 100ms': (r) => r.timings.duration < 100,
    });
  });

  group('API Root', () => {
    const rootRes = http.get(`${BASE_URL}/`);
    check(rootRes, {
      'root returns 200': (r) => r.status === 200,
    });
  });

  group('Verification Flow - US NPI', () => {
    const verifyPayload = JSON.stringify({
      providerId: `test-${Date.now()}`,
      countryCode: 'US',
      attributes: {
        firstName: 'John',
        lastName: 'Smith',
        licenseNumber: '1234567890', // Test NPI
      },
    });

    const startTime = Date.now();
    const verifyRes = http.post(`${BASE_URL}/v1/verify`, verifyPayload, { headers });
    const duration = Date.now() - startTime;
    
    verifyDuration.add(duration);
    
    const verifySuccess = check(verifyRes, {
      'verify returns 200 or 201': (r) => r.status === 200 || r.status === 201,
      'verify response has status field': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status !== undefined;
        } catch {
          return false;
        }
      },
      'verify response time < 2s': (r) => r.timings.duration < 2000,
    });

    errorRate.add(!verifySuccess);
  });

  group('Swagger Documentation', () => {
    const swaggerRes = http.get(`${BASE_URL}/api`);
    check(swaggerRes, {
      'swagger UI loads': (r) => r.status === 200,
    });
  });

  // Think time between iterations
  sleep(1);
}

// Setup: Run once before tests
export function setup() {
  console.log(`Testing VeriMed API at ${BASE_URL}`);
  
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`API not healthy: ${healthCheck.status}`);
  }
  
  return { startTime: Date.now() };
}

// Teardown: Run once after tests
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Test completed in ${duration}s`);
}
